const Rental = require('../models/Rental');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const { createNotification } = require('../controllers/notificationController');

const TIMEZONE = 'Asia/Karachi';
const INTERVAL_MS = 60 * 60 * 1000;
const PAID_STATUSES = ['pending_settlement', 'settled'];

const PAYMENT_TYPES = {
  due_3: 'payment_due_in_3',
  due_1: 'payment_due_in_1',
  due_today: 'payment_due_today',
  overdue: 'payment_overdue',
};

let jobRunning = false;
let intervalHandle = null;

const getDateParts = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
  };
};

const toYmd = (parts) => {
  if (!parts) {
    return null;
  }

  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
};

const lastDayOfMonth = (year, month) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

const dueDateInMonth = (year, month, dueDay) => {
  const last = lastDayOfMonth(year, month);
  const day = Math.min(Math.max(1, dueDay), last);
  return { year, month, day };
};

const addMonths = (parts, count) => {
  const utc = new Date(Date.UTC(parts.year, parts.month - 1 + count, 1));
  const year = utc.getUTCFullYear();
  const month = utc.getUTCMonth() + 1;
  return dueDateInMonth(year, month, parts.day);
};

const compareParts = (a, b) => {
  if (a.year !== b.year) {
    return a.year - b.year;
  }
  if (a.month !== b.month) {
    return a.month - b.month;
  }
  return a.day - b.day;
};

const diffDays = (fromParts, toParts) => {
  const fromUtc = Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day);
  const toUtc = Date.UTC(toParts.year, toParts.month - 1, toParts.day);
  return Math.round((toUtc - fromUtc) / 86400000);
};

const pkNoonDate = (parts) => {
  const ymd = toYmd(parts);
  if (!ymd) {
    return null;
  }
  return new Date(`${ymd}T12:00:00+05:00`);
};

const firstOfMonthPk = (parts) =>
  new Date(
    `${parts.year}-${String(parts.month).padStart(2, '0')}-01T00:00:00+05:00`
  );

const displayName = (user) => {
  if (!user || typeof user !== 'object') {
    return 'the tenant';
  }
  const name = String(user.name || '').trim();
  return name || 'the tenant';
};

const nextDueAfter = (dueParts) => addMonths({ ...dueParts, day: dueParts.day }, 1);

const isCyclePaid = async (rentalId, dueParts) => {
  if (!rentalId || !dueParts) {
    return true;
  }

  const nextDue = nextDueAfter(dueParts);
  const windowStart = firstOfMonthPk(dueParts);
  const windowEnd = pkNoonDate(nextDue);
  if (!windowStart || !windowEnd) {
    return true;
  }

  const paid = await Payment.findOne({
    rental: rentalId,
    status: { $in: PAID_STATUSES },
    paidAt: { $gte: windowStart, $lt: windowEnd },
  })
    .select('_id')
    .lean();

  return Boolean(paid);
};

const firstDueOnOrAfterStart = (leaseStart, dueDay) => {
  const candidate = dueDateInMonth(leaseStart.year, leaseStart.month, dueDay);
  if (compareParts(candidate, leaseStart) >= 0) {
    return candidate;
  }
  return addMonths({ year: leaseStart.year, month: leaseStart.month, day: dueDay }, 1);
};

const lastDueOnOrBefore = (anchor, dueDay, leaseStart, leaseEnd) => {
  let cursor = dueDateInMonth(anchor.year, anchor.month, dueDay);
  if (compareParts(cursor, anchor) > 0) {
    cursor = addMonths({ year: cursor.year, month: cursor.month, day: dueDay }, -1);
  }

  if (compareParts(cursor, leaseStart) < 0) {
    return null;
  }
  if (compareParts(cursor, leaseEnd) > 0) {
    cursor = dueDateInMonth(leaseEnd.year, leaseEnd.month, dueDay);
    if (compareParts(cursor, leaseEnd) > 0) {
      cursor = addMonths({ year: leaseEnd.year, month: leaseEnd.month, day: dueDay }, -1);
    }
  }
  if (!cursor || compareParts(cursor, leaseStart) < 0) {
    return null;
  }
  return cursor;
};

const nextDueOnOrAfter = (anchor, dueDay, leaseStart, leaseEnd) => {
  let cursor = dueDateInMonth(anchor.year, anchor.month, dueDay);
  if (compareParts(cursor, anchor) < 0) {
    cursor = addMonths({ year: cursor.year, month: cursor.month, day: dueDay }, 1);
  }
  if (compareParts(cursor, leaseStart) < 0) {
    cursor = firstDueOnOrAfterStart(leaseStart, dueDay);
  }
  if (compareParts(cursor, leaseEnd) > 0) {
    return null;
  }
  return cursor;
};

const sendReminder = async ({
  recipientId,
  type,
  title,
  message,
  rentalId,
  assetId,
  dueYmd,
  occurrenceYmd,
  audience,
}) => {
  const recipient = recipientId?.toString?.();
  const rental = rentalId?.toString?.();

  if (!recipient || !type || !rental || !dueYmd || !occurrenceYmd) {
    return;
  }

  const scheduleKey = `pay:${type}:${rental}:${dueYmd}:${recipient}:${occurrenceYmd}`;

  try {
    await createNotification({
      recipient,
      type,
      title,
      message,
      relatedAsset: assetId || null,
      relatedRental: rental,
      scheduleKey,
      audience,
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return;
    }
    console.error('Payment reminder notification error:', error.message || error);
  }
};

const hasPriorOverdue = async (recipientId, rentalId, dueYmd) => {
  const recipient = recipientId?.toString?.();
  const rental = rentalId?.toString?.();
  if (!recipient || !rental || !dueYmd) {
    return false;
  }

  const prefix = `pay:${PAYMENT_TYPES.overdue}:${rental}:${dueYmd}:${recipient}:`;
  const existing = await Notification.findOne({
    recipient,
    type: PAYMENT_TYPES.overdue,
    relatedRental: rental,
    scheduleKey: { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` },
  })
    .select('_id')
    .lean();

  return Boolean(existing);
};

const processRental = async (rental, todayParts) => {
  const tenantId = rental.tenant?._id || rental.tenant;
  const ownerId = rental.owner?._id || rental.owner;
  const assetId = rental.asset?._id || rental.asset;

  if (!tenantId || !ownerId) {
    return;
  }

  const leaseStart = getDateParts(rental.leaseStartDate);
  const leaseEnd = getDateParts(rental.leaseEndDate);
  if (!leaseStart || !leaseEnd) {
    return;
  }

  if (compareParts(todayParts, leaseStart) < 0) {
    return;
  }

  const dueDay = leaseStart.day;
  if (!dueDay) {
    return;
  }

  const tenantName = displayName(rental.tenant);
  const nextDue = nextDueOnOrAfter(todayParts, dueDay, leaseStart, leaseEnd);
  const lastDue = lastDueOnOrBefore(todayParts, dueDay, leaseStart, leaseEnd);

  if (nextDue) {
    const daysUntil = diffDays(todayParts, nextDue);
    const dueYmd = toYmd(nextDue);
    const paid = await isCyclePaid(rental._id, nextDue);

    if (!paid && dueYmd) {
      if (daysUntil === 3) {
        await sendReminder({
          recipientId: tenantId,
          type: PAYMENT_TYPES.due_3,
          title: 'Payment reminder',
          message: 'Payment is due in 3 days.',
          rentalId: rental._id,
          assetId,
          dueYmd,
          occurrenceYmd: dueYmd,
          audience: 'tenant',
        });
        await sendReminder({
          recipientId: ownerId,
          type: PAYMENT_TYPES.due_3,
          title: 'Payment reminder',
          message: `Payment from ${tenantName} is due in 3 days.`,
          rentalId: rental._id,
          assetId,
          dueYmd,
          occurrenceYmd: dueYmd,
          audience: 'owner',
        });
      }

      if (daysUntil === 1) {
        await sendReminder({
          recipientId: tenantId,
          type: PAYMENT_TYPES.due_1,
          title: 'Payment reminder',
          message: 'Payment is due tomorrow.',
          rentalId: rental._id,
          assetId,
          dueYmd,
          occurrenceYmd: dueYmd,
          audience: 'tenant',
        });
        await sendReminder({
          recipientId: ownerId,
          type: PAYMENT_TYPES.due_1,
          title: 'Payment reminder',
          message: `Payment from ${tenantName} is due tomorrow.`,
          rentalId: rental._id,
          assetId,
          dueYmd,
          occurrenceYmd: dueYmd,
          audience: 'owner',
        });
      }

      if (daysUntil === 0) {
        await sendReminder({
          recipientId: tenantId,
          type: PAYMENT_TYPES.due_today,
          title: 'Payment due',
          message: 'Your payment is due today.',
          rentalId: rental._id,
          assetId,
          dueYmd,
          occurrenceYmd: dueYmd,
          audience: 'tenant',
        });
        await sendReminder({
          recipientId: ownerId,
          type: PAYMENT_TYPES.due_today,
          title: 'Payment due',
          message: `Payment from ${tenantName} is due today.`,
          rentalId: rental._id,
          assetId,
          dueYmd,
          occurrenceYmd: dueYmd,
          audience: 'owner',
        });
      }
    }
  }

  if (lastDue && compareParts(lastDue, todayParts) < 0) {
    const dueYmd = toYmd(lastDue);
    const paid = await isCyclePaid(rental._id, lastDue);
    if (paid || !dueYmd) {
      return;
    }

    const todayYmd = toYmd(todayParts);
    const tenantHadOverdue = await hasPriorOverdue(tenantId, rental._id, dueYmd);
    const ownerHadOverdue = await hasPriorOverdue(ownerId, rental._id, dueYmd);

    await sendReminder({
      recipientId: tenantId,
      type: PAYMENT_TYPES.overdue,
      title: 'Payment overdue',
      message: tenantHadOverdue
        ? 'Your payment is still overdue.'
        : 'Your payment is overdue.',
      rentalId: rental._id,
      assetId,
      dueYmd,
      occurrenceYmd: todayYmd,
      audience: 'tenant',
    });
    await sendReminder({
      recipientId: ownerId,
      type: PAYMENT_TYPES.overdue,
      title: 'Payment overdue',
      message: ownerHadOverdue
        ? `Payment from ${tenantName} is still overdue.`
        : `Payment from ${tenantName} is overdue.`,
      rentalId: rental._id,
      assetId,
      dueYmd,
      occurrenceYmd: todayYmd,
      audience: 'owner',
    });
  }
};

const runPaymentReminders = async () => {
  if (jobRunning) {
    return;
  }

  jobRunning = true;
  try {
    const todayParts = getDateParts(new Date());
    if (!todayParts) {
      return;
    }

    const rentals = await Rental.find({ isCurrent: true })
      .populate('tenant', 'name')
      .populate('owner', 'name')
      .select('tenant owner asset leaseStartDate leaseEndDate isCurrent')
      .lean();

    for (const rental of rentals) {
      try {
        await processRental(rental, todayParts);
      } catch (error) {
        console.error(
          'Payment reminder rental error:',
          rental?._id?.toString(),
          error.message || error
        );
      }
    }
  } catch (error) {
    console.error('Payment reminder job error:', error.message || error);
  } finally {
    jobRunning = false;
  }
};

const startPaymentReminderScheduler = () => {
  if (intervalHandle) {
    return;
  }

  setTimeout(() => {
    void runPaymentReminders();
  }, 8000);

  intervalHandle = setInterval(() => {
    void runPaymentReminders();
  }, INTERVAL_MS);

  if (typeof intervalHandle.unref === 'function') {
    intervalHandle.unref();
  }

  console.log(
    'Payment reminder scheduler started (hourly, Asia/Karachi calendar dates)'
  );
};

module.exports = {
  startPaymentReminderScheduler,
  runPaymentReminders,
};
