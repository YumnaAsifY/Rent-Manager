const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ['fake_property', 'spam_misuse', 'unpaid_rent'],
      required: true,
    },

    relatedAsset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      default: null,
    },

    relatedRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RentalRequest',
      default: null,
    },

    status: {
      type: String,
      enum: ['pending', 'dismissed', 'warned', 'resolved'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

reportSchema.index({ reporter: 1, type: 1, relatedAsset: 1, relatedRequest: 1 });

module.exports = mongoose.model('Report', reportSchema);
