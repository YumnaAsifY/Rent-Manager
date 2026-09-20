const Payment = require('../models/Payment');

const TIMEZONE = 'Asia/Karachi';
const PAID_STATUSES = ['pending_settlement', 'settled'];

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
  const ymd = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
  return new Date(`${ymd}T12:00:00+05:00`);
};

const firstOfMonthPk = (parts) =>
  new Date(
    `${parts.year}-${String(parts.month).padStart(2, '0')}-01T00:00:00+05:00`
  );

const nextDueAfter = (dueParts) =>
  addMonths({ year: dueParts.year, month: dueParts.month, day: dueParts.day }, 1);

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
  return addMonths(
    { year: leaseStart.year, month: leaseStart.month, day: dueDay },
    1
  );
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

const findPayableDue = async (rentalId, leaseStart, leaseEnd, dueDay, todayParts) => {
  let cursor = firstDueOnOrAfterStart(leaseStart, dueDay);

  while (cursor && compareParts(cursor, leaseEnd) <= 0) {
    if (compareParts(cursor, todayParts) <= 0) {
      if (!(await isCyclePaid(rentalId, cursor))) {
        return cursor;
      }
    } else {
      const daysUntil = diffDays(todayParts, cursor);
      if (daysUntil <= 3 && !(await isCyclePaid(rentalId, cursor))) {
        return cursor;
      }
      break;
    }

    cursor = addMonths(
      { year: cursor.year, month: cursor.month, day: dueDay },
      1
    );
  }

  return null;
};

const getRentalBillingState = async (rental, todayParts = getDateParts()) => {
  const defaultState = {
    canPayRent: false,
    currentCyclePaid: true,
    isOverdue: false,
  };

  if (!rental || !todayParts) {
    return defaultState;
  }

  if (rental.removedAt) {
    return defaultState;
  }

  const leaseStart = getDateParts(rental.leaseStartDate);
  const leaseEnd = getDateParts(rental.leaseEndDate);
  if (!leaseStart || !leaseEnd) {
    return defaultState;
  }

  if (compareParts(todayParts, leaseStart) < 0) {
    return defaultState;
  }

  const dueDay = leaseStart.day;
  if (!dueDay) {
    return defaultState;
  }

  const monthlyRent =
    rental.monthlyRent != null && Number(rental.monthlyRent) > 0
      ? Number(rental.monthlyRent)
      : rental.asset?.monthlyRent != null && Number(rental.asset.monthlyRent) > 0
        ? Number(rental.asset.monthlyRent)
        : null;

  if (monthlyRent == null) {
    return defaultState;
  }

  const rentalId = rental._id || rental.id;
  const payableDue = await findPayableDue(
    rentalId,
    leaseStart,
    leaseEnd,
    dueDay,
    todayParts
  );

  if (!payableDue) {
    return {
      canPayRent: false,
      currentCyclePaid: true,
      isOverdue: false,
    };
  }

  return {
    canPayRent: true,
    currentCyclePaid: false,
    isOverdue: compareParts(payableDue, todayParts) < 0,
  };
};

const getLatestPaidPayment = async (rentalId) => {
  if (!rentalId) {
    return null;
  }

  return Payment.findOne({
    rental: rentalId,
    status: { $in: PAID_STATUSES },
  })
    .sort({ paidAt: -1, createdAt: -1 })
    .select('status paidAt settledAt')
    .lean();
};

const getOwnerRentPaymentStatus = async (rental) => {
  const billing = await getRentalBillingState(rental);
  const latest = await getLatestPaidPayment(rental?._id || rental?.id);

  if (billing.canPayRent) {
    return {
      rentPaymentStatus: billing.isOverdue ? 'overdue' : 'unpaid',
      rentPaymentLabel: billing.isOverdue ? 'Overdue' : 'Unpaid',
    };
  }

  if (latest?.status === 'settled') {
    return {
      rentPaymentStatus: 'settled',
      rentPaymentLabel: 'Settled',
    };
  }

  if (latest?.status === 'pending_settlement') {
    return {
      rentPaymentStatus: 'paid',
      rentPaymentLabel: 'Paid',
    };
  }

  return {
    rentPaymentStatus: null,
    rentPaymentLabel: null,
  };
};

module.exports = {
  getDateParts,
  compareParts,
  isCyclePaid,
  getRentalBillingState,
  getOwnerRentPaymentStatus,
  PAID_STATUSES,
};
