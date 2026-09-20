const mongoose = require('mongoose');

/**
 * Platform payment: tenant pays full amount to Admin (Safepay).
 * Admin keeps profit %; owner share is settled manually later.
 *
 * Live switch later: same schema; only SAFEPAY_ENV + keys change.
 */
const paymentSchema = new mongoose.Schema(
  {
    rental: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rental',
      required: true,
      index: true,
    },

    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /** Full amount charged to tenant (PKR). */
    totalAmount: {
      type: Number,
      required: true,
      min: 1,
    },

    currency: {
      type: String,
      default: 'PKR',
      trim: true,
      uppercase: true,
    },

    /** Snapshot at payment time (e.g. 3). */
    adminProfitPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    adminProfitAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    ownerShareAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    /**
     * created — session started, not paid yet
     * pending_settlement — paid to admin via Safepay; owner not settled
     * settled — admin marked owner payout done
     * failed — Safepay failed / cancelled
     */
    status: {
      type: String,
      enum: ['created', 'pending_settlement', 'settled', 'failed'],
      default: 'created',
      required: true,
      index: true,
    },

    /** Safepay tracker / payment token from create session. */
    safepayTracker: {
      type: String,
      default: null,
      trim: true,
      index: true,
      sparse: true,
    },

    safepayEnvironment: {
      type: String,
      enum: ['sandbox', 'production'],
      default: 'sandbox',
    },

    paidAt: {
      type: Date,
      default: null,
    },

    settledAt: {
      type: Date,
      default: null,
    },

    settlementNote: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ tenant: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ owner: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
