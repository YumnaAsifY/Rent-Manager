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

    // Set only when created from an accepted rental request.
    // Direct assign leaves this unset so many rentals can exist without a request.
    rentalRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RentalRequest',
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
rentalSchema.index(
  { rentalRequest: 1 },
  {
    unique: true,
    name: 'rentalRequest_unique_when_set',
    partialFilterExpression: { rentalRequest: { $type: 'objectId' } },
  }
);

const Rental = mongoose.model('Rental', rentalSchema);

Rental.syncRentalRequestIndex = async function syncRentalRequestIndex() {
  try {
    await Rental.collection.dropIndex('rentalRequest_1');
  } catch (error) {
    if (error.code !== 27 && error.codeName !== 'IndexNotFound') {
      throw error;
    }
  }

  await Rental.syncIndexes();
};

module.exports = Rental;
