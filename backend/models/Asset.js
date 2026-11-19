const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: '',
    },

    image: {
      type: String,
      trim: true,
      default: '',
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Available | Rented — Lease Ended is derived when Rented and leaseEndDate passed
    status: {
      type: String,
      enum: ['Available', 'Rented'],
      default: 'Available',
      required: true,
    },

    // Optional for Phase 1; used by later rental/lease phases
    monthlyRent: {
      type: Number,
      min: 0,
    },

    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    leaseStartDate: {
      type: Date,
      default: null,
    },

    leaseEndDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Asset', assetSchema);
