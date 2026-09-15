const mongoose = require('mongoose');

const Payment = require('../models/Payment');
const Rental = require('../models/Rental');
const { createNotification } = require('./notificationController');
const { PAID_STATUSES } = require('../utils/billingCycle');
const { formatPayoutForAdmin } = require('../utils/payout');
const {
  createSafepayCheckout,
  fetchSafepayTrackerWithRetry,
  normalizeSafepayTracker,
  splitPaymentAmounts,
} = require('../services/safepayService');
const { getSafepayConfig } = require('../config/safepay');

const resolveMonthlyRent = (rental) => {
  if (rental.monthlyRent != null && Number(rental.monthlyRent) > 0) {
    return Number(rental.monthlyRent);
  }

  const assetRent = rental.asset?.monthlyRent;
  if (assetRent != null && Number(assetRent) > 0) {
    return Number(assetRent);
  }

  return null;
};

/** Extract a clean 24-char Mongo ObjectId from messy redirect query values. */
const normalizePaymentId = (value) => {
  if (value == null) {
    return null;
  }

  const candidates = Array.isArray(value) ? value : [value];
  for (const candidate of candidates) {
    const match = String(candidate).match(/[a-f0-9]{24}/i);
    if (match && mongoose.Types.ObjectId.isValid(match[0])) {
      return match[0];
    }
  }

  return null;
};

const serializePayment = (payment) => ({
  id: payment._id.toString(),
  status: payment.status,
  totalAmount: payment.totalAmount,
  currency: payment.currency,
  adminProfitPercent: payment.adminProfitPercent,
  adminProfitAmount: payment.adminProfitAmount,
  ownerShareAmount: payment.ownerShareAmount,
  safepayTracker: payment.safepayTracker,
  safepayEnvironment: payment.safepayEnvironment,
  rentalId: payment.rental?.toString?.() || String(payment.rental),
  paidAt: payment.paidAt,
  settledAt: payment.settledAt,
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,
});

const formatAdminDate = (value) => {
  if (!value) {
    return '';
  }
  return new Date(value).toISOString().slice(0, 10);
};

const serializeAdminPayment = (payment) => {
  const tenant =
    payment.tenant && typeof payment.tenant === 'object' ? payment.tenant : null;
  const owner =
    payment.owner && typeof payment.owner === 'object' ? payment.owner : null;
  const asset =
    payment.asset && typeof payment.asset === 'object' ? payment.asset : null;

  return {
    id: payment._id.toString(),
    date: formatAdminDate(payment.paidAt || payment.createdAt),
    tenantName: tenant?.name || 'Unknown tenant',
    ownerName: owner?.name || 'Unknown owner',
    assetName: asset?.name || 'Unknown asset',
    totalAmount: payment.totalAmount,
    adminProfitPercent: payment.adminProfitPercent,
    adminProfitAmount: payment.adminProfitAmount,
    ownerShareAmount: payment.ownerShareAmount,
    ...formatPayoutForAdmin(owner),
    status: payment.status,
    paidAt: payment.paidAt,
    settledAt: payment.settledAt,
  };
};

const populateAdminPaymentQuery = (query) =>
  query
    .populate('tenant', 'name email phoneNumber')
    .populate(
      'owner',
      'name email phoneNumber payoutMethod payoutAccountName payoutNumber payoutBankName'
    )
    .populate('asset', 'name');

const populateHistoryPaymentQuery = (query) =>
  query
    .populate('tenant', 'name')
    .populate('owner', 'name')
    .populate('asset', 'name location');

const formatHistoryDate = (value) => {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatCurrency = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString('en-PK')}`;

const serializeHistoryPayment = (payment, userId) => {
  const tenant =
    payment.tenant && typeof payment.tenant === 'object' ? payment.tenant : null;
  const owner =
    payment.owner && typeof payment.owner === 'object' ? payment.owner : null;
  const asset =
    payment.asset && typeof payment.asset === 'object' ? payment.asset : null;
  const userIdStr = userId.toString();
  const viewerRole =
    payment.tenant?.toString?.() === userIdStr ? 'tenant' : 'owner';

  return {
    id: payment._id.toString(),
    assetName: asset?.name || 'Unknown asset',
    assetLocation: asset?.location || null,
    tenantName: tenant?.name || 'Unknown tenant',
    ownerName: owner?.name || 'Unknown owner',
    totalAmount: payment.totalAmount,
    ownerShareAmount: payment.ownerShareAmount,
    status: payment.status,
    paidAt: payment.paidAt,
    settledAt: payment.settledAt,
    paidDate: formatHistoryDate(payment.paidAt || payment.createdAt),
    settledDate: formatHistoryDate(payment.settledAt),
    viewerRole,
    rentalId: payment.rental?.toString?.() || String(payment.rental),
    assetId: payment.asset?.toString?.() || String(payment.asset),
  };
};

const notifyOwnerPaymentReceived = async (payment) => {
  const populated = await populateHistoryPaymentQuery(
    Payment.findById(payment._id)
  );
  if (!populated) {
    return;
  }

  const tenantName = populated.tenant?.name || 'The tenant';
  const assetName = populated.asset?.name || 'your property';

  await createNotification({
    recipient: populated.owner._id || populated.owner,
    type: 'payment_received',
    title: 'Payment received',
    message: `${tenantName} paid rent for ${assetName}. Admin will settle your share.`,
    relatedAsset: populated.asset._id || populated.asset,
    relatedRental: populated.rental,
    relatedPayment: populated._id,
    audience: 'owner',
  });
};

const notifyOwnerPaymentSettled = async (payment) => {
  const populated = await populateHistoryPaymentQuery(
    Payment.findById(payment._id)
  );
  if (!populated) {
    return;
  }

  const assetName = populated.asset?.name || 'your property';
  const share = formatCurrency(populated.ownerShareAmount);

  await createNotification({
    recipient: populated.owner._id || populated.owner,
    type: 'payment_settled',
    title: 'Share settled',
    message: `Your share (${share}) for ${assetName} has been settled by admin.`,
    relatedAsset: populated.asset._id || populated.asset,
    relatedRental: populated.rental,
    relatedPayment: populated._id,
    audience: 'owner',
  });
};

/**
 * POST /api/payments/create-session
 * Body: { rentalId }
 * Auth: tenant (Bearer)
 *
 * Creates Payment (status: created) + Safepay hosted checkout URL.
 */
const createPaymentSession = async (req, res) => {
  try {
    const { rentalId } = req.body || {};

    if (!rentalId || !mongoose.Types.ObjectId.isValid(rentalId)) {
      return res.status(400).json({ message: 'Valid rentalId is required' });
    }

    const rental = await Rental.findById(rentalId).populate(
      'asset',
      'name monthlyRent'
    );

    if (!rental) {
      return res.status(404).json({ message: 'Rental not found' });
    }

    if (rental.tenant.toString() !== req.userId) {
      return res.status(403).json({
        message: 'Only the tenant of this rental can start a payment',
      });
    }

    const totalAmount = resolveMonthlyRent(rental);
    if (totalAmount == null) {
      return res.status(400).json({
        message: 'This rental has no monthly rent set. Cannot create payment.',
      });
    }

    const config = getSafepayConfig();
    const split = splitPaymentAmounts(totalAmount, config.adminProfitPercent);

    const payment = await Payment.create({
      rental: rental._id,
      asset: rental.asset?._id || rental.asset,
      owner: rental.owner,
      tenant: rental.tenant,
      totalAmount,
      currency: 'PKR',
      adminProfitPercent: split.adminProfitPercent,
      adminProfitAmount: split.adminProfitAmount,
      ownerShareAmount: split.ownerShareAmount,
      status: 'created',
      safepayEnvironment: config.environment,
    });

    let checkout;
    try {
      checkout = await createSafepayCheckout({
        amountPkr: totalAmount,
        currency: 'PKR',
        // Used as Safepay metadata.order_id (only allowed meta key).
        orderId: payment._id.toString(),
      });
    } catch (safepayError) {
      payment.status = 'failed';
      await payment.save();

      const statusCode = safepayError.statusCode || 502;
      console.error('Safepay create session error:', safepayError);

      return res.status(statusCode).json({
        message:
          safepayError.message ||
          'Unable to create Safepay checkout. Check API keys and try again.',
      });
    }

    payment.safepayTracker = checkout.tracker;
    await payment.save();

    return res.status(201).json({
      payment: serializePayment(payment),
      checkoutUrl: checkout.checkoutUrl,
      redirectUrl: checkout.redirectUrl,
      cancelUrl: checkout.cancelUrl,
    });
  } catch (error) {
    if (error.statusCode === 503) {
      return res.status(503).json({ message: error.message });
    }

    console.error('Create payment session error:', error);

    return res.status(500).json({
      message: 'Server error while creating payment session',
    });
  }
};

/**
 * POST /api/payments/verify
 * Body: { paymentId } and/or { tracker }
 * Auth: tenant who owns the payment
 *
 * Asks Safepay for tracker state. If TRACKER_ENDED → pending_settlement.
 */
const verifyPayment = async (req, res) => {
  try {
    const { paymentId, tracker } = req.body || {};

    let payment = null;

    const cleanPaymentId = normalizePaymentId(paymentId);

    if (cleanPaymentId) {
      payment = await Payment.findById(cleanPaymentId);
    } else if (tracker) {
      const cleanTracker = normalizeSafepayTracker(tracker);
      if (!cleanTracker) {
        return res.status(400).json({ message: 'Invalid Safepay tracker' });
      }
      payment = await Payment.findOne({ safepayTracker: cleanTracker });
    } else {
      return res.status(400).json({
        message: 'paymentId or tracker is required',
      });
    }

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.tenant.toString() !== req.userId) {
      return res.status(403).json({
        message: 'You can only verify your own payments',
      });
    }

    // Already confirmed — idempotent.
    if (
      payment.status === 'pending_settlement' ||
      payment.status === 'settled'
    ) {
      return res.status(200).json({
        verified: true,
        safepayState: 'TRACKER_ENDED',
        payment: serializePayment(payment),
      });
    }

    // Prefer DB tracker (saved at session create). URL tracker can be corrupted.
    const trackerToken =
      payment.safepayTracker || normalizeSafepayTracker(tracker);
    if (!trackerToken) {
      return res.status(400).json({
        message: 'No Safepay tracker on this payment yet',
      });
    }

    let safepayResult;
    try {
      safepayResult = await fetchSafepayTrackerWithRetry(trackerToken, {
        attempts: 4,
        delayMs: 1500,
      });
      console.log('Safepay verify result:', {
        tracker: trackerToken,
        state: safepayResult?.state,
        isPaid: safepayResult?.isPaid,
        dataKeys: safepayResult?.raw?.data
          ? Object.keys(safepayResult.raw.data)
          : [],
      });
    } catch (safepayError) {
      console.error('Safepay verify fetch error:', safepayError);
      return res.status(502).json({
        message:
          safepayError.message ||
          'Unable to verify payment with Safepay. Try again shortly.',
      });
    }

    if (safepayResult.isPaid) {
      const wasAlreadyPaid =
        payment.status === 'pending_settlement' || payment.status === 'settled';

      payment.status = 'pending_settlement';
      payment.paidAt = payment.paidAt || new Date();
      await payment.save();

      if (!wasAlreadyPaid) {
        try {
          await notifyOwnerPaymentReceived(payment);
        } catch (notifyError) {
          console.error('Payment received notification error:', notifyError);
        }
      }

      return res.status(200).json({
        verified: true,
        safepayState: safepayResult.state,
        payment: serializePayment(payment),
      });
    }

    const stateLabel = safepayResult.state || 'unknown';
    return res.status(200).json({
      verified: false,
      safepayState: safepayResult.state,
      payment: serializePayment(payment),
      message: `Payment is not completed on Safepay yet (status: ${stateLabel}). Wait a moment and retry.`,
    });
  } catch (error) {
    if (error.statusCode === 503) {
      return res.status(503).json({ message: error.message });
    }

    console.error('Verify payment error:', error);

    return res.status(500).json({
      message: 'Server error while verifying payment',
    });
  }
};

/**
 * GET /api/payments/admin?status=all|pending_settlement|settled
 * Auth: logged-in (admin role comes in Phase 9)
 */
const getAdminPayments = async (req, res) => {
  try {
    const status = String(req.query.status || 'all');
    const filter = {};

    if (status === 'pending_settlement' || status === 'settled') {
      filter.status = status;
    } else {
      filter.status = { $in: ['pending_settlement', 'settled'] };
    }

    const payments = await populateAdminPaymentQuery(
      Payment.find(filter).sort({ paidAt: -1, createdAt: -1 })
    );

    return res.status(200).json({
      payments: payments.map(serializeAdminPayment),
    });
  } catch (error) {
    console.error('Get admin payments error:', error);
    return res.status(500).json({
      message: 'Server error while fetching payments',
    });
  }
};

/**
 * GET /api/payments/admin/stats
 */
const getAdminStats = async (req, res) => {
  try {
    const User = require('../models/User');
    const Asset = require('../models/Asset');

    const [totalUsers, activeUsers, totalAssets, pendingSettlements] =
      await Promise.all([
        User.countDocuments({ role: { $ne: 'admin' } }),
        User.countDocuments({
          role: { $ne: 'admin' },
          isActive: { $ne: false },
        }),
        Asset.countDocuments({}),
        Payment.countDocuments({ status: 'pending_settlement' }),
      ]);

    return res.status(200).json({
      totalUsers,
      activeUsers,
      totalAssets,
      pendingSettlements,
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return res.status(500).json({
      message: 'Server error while fetching admin stats',
    });
  }
};

/**
 * PATCH /api/payments/:id/settle
 */
const settlePayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Valid payment id is required' });
    }

    const payment = await populateAdminPaymentQuery(Payment.findById(id));

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status === 'settled') {
      return res.status(200).json({ payment: serializeAdminPayment(payment) });
    }

    if (payment.status !== 'pending_settlement') {
      return res.status(400).json({
        message: 'Only paid payments can be marked settled',
      });
    }

    payment.status = 'settled';
    payment.settledAt = new Date();
    await payment.save();

    try {
      await notifyOwnerPaymentSettled(payment);
    } catch (notifyError) {
      console.error('Payment settled notification error:', notifyError);
    }

    const updated = await populateAdminPaymentQuery(Payment.findById(payment._id));

    return res.status(200).json({
      payment: serializeAdminPayment(updated),
    });
  } catch (error) {
    console.error('Settle payment error:', error);
    return res.status(500).json({
      message: 'Server error while settling payment',
    });
  }
};

/**
 * GET /api/payments/history
 * Auth: tenant and/or owner — returns confirmed payments for the logged-in user.
 */
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.userId;

    const payments = await populateHistoryPaymentQuery(
      Payment.find({
        status: { $in: PAID_STATUSES },
        $or: [{ tenant: userId }, { owner: userId }],
      }).sort({ paidAt: -1, createdAt: -1 })
    );

    return res.status(200).json({
      payments: payments.map((payment) =>
        serializeHistoryPayment(payment, userId)
      ),
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    return res.status(500).json({
      message: 'Server error while fetching payment history',
    });
  }
};

module.exports = {
  createPaymentSession,
  verifyPayment,
  getPaymentHistory,
  getAdminPayments,
  getAdminStats,
  settlePayment,
};
