const mongoose = require('mongoose');

const rentalRequestSchema = new mongoose.Schema(
  {
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

    leaseStartDate: {
      type: Date,
      required: true,
    },

    leaseEndDate: {
      type: Date,
      required: true,
    },

    // Pending | Accepted | Rejected — Phase 3 only creates Pending
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected'],
      default: 'Pending',
      required: true,
      index: true,
    },

    ownerDeleted: {
      type: Boolean,
      default: false,
    },

    tenantDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

rentalRequestSchema.index({ tenant: 1, asset: 1, status: 1 });
rentalRequestSchema.index({ tenant: 1, createdAt: -1 });

module.exports = mongoose.model('RentalRequest', rentalRequestSchema);
