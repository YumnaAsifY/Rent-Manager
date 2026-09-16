const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    passwordResetToken: {
      type: String,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      select: false,
    },

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    deactivationReason: {
      type: String,
      enum: ['fraud_scam', 'platform_misuse', 'non_payment'],
      default: undefined,
    },

    payoutMethod: {
      type: String,
      enum: ['none', 'jazzcash', 'easypaisa', 'bank'],
      default: 'none',
    },

    payoutAccountName: {
      type: String,
      trim: true,
      default: '',
    },

    payoutNumber: {
      type: String,
      trim: true,
      default: '',
    },

    payoutBankName: {
      type: String,
      trim: true,
      default: '',
    },

    emailVerified: {
      type: Boolean,
    },

    emailVerificationToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);