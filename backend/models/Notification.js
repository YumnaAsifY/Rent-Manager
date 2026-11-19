const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        'rental_request_received',
        'rental_request_accepted',
        'rental_request_rejected',
        'payment_due_in_3',
        'payment_due_in_1',
        'payment_due_today',
        'payment_overdue',
        'payment_unpaid_warning',
        'payment_received',
        'payment_settled',
        'payment_sent_to_admin',
        'asset_assigned',
        'tenancy_cancelled',
        'admin_dispute_email',
      ],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    relatedRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RentalRequest',
      default: null,
    },

    relatedAsset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      default: null,
    },

    relatedRental: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rental',
      default: null,
    },

    relatedPayment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },

    /**
     * Unique per reminder occurrence so the scheduler cannot insert duplicates.
     * Sparse: rental-request notifications do not use this field.
     */
    scheduleKey: {
      type: String,
      default: undefined,
      trim: true,
    },

    audience: {
      type: String,
      enum: ['tenant', 'owner'],
      default: undefined,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    isHidden: {
      type: Boolean,
      default: false,
      index: true,
    },

    cancellationReason: {
      type: String,
      trim: true,
      default: '',
    },

    cancellationOwnerName: {
      type: String,
      trim: true,
      default: '',
    },

    cancellationAssetName: {
      type: String,
      trim: true,
      default: '',
    },

    cancellationAssetType: {
      type: String,
      trim: true,
      default: '',
    },

    cancellationAssetLocation: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index(
  { scheduleKey: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
