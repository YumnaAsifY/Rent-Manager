const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema(
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

    monthlyRent: {
      type: Number,
      min: 0,
      default: null,
    },

    // Links acceptance to exactly one rental (prevents duplicates).
    rentalRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RentalRequest',
      default: null,
      unique: true,
      sparse: true,
    },

    // Current lease on the asset vs historical record kept after Make Available.
    isCurrent: {
      type: Boolean,
      default: true,
      index: true,
    },

    tenantDeleted: {
      type: Boolean,
      default: false,
    },

    removedAt: {
      type: Date,
      default: null,
    },

    removalReason: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

rentalSchema.index({ tenant: 1, createdAt: -1 });

module.exports = mongoose.model('Rental', rentalSchema);
