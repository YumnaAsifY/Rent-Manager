const mongoose = require('mongoose');

const User = require('../models/User');
const Asset = require('../models/Asset');
const Rental = require('../models/Rental');
const { formatPayoutForAdmin, serializePayout } = require('../utils/payout');

const VERIFIED_USER_FILTER = {
  role: { $ne: 'admin' },
  emailVerified: { $ne: false },
};

const serializeAdminUser = (user, extra = {}) => {
  const payout = formatPayoutForAdmin(user);

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phoneNumber,
    isActive: user.isActive !== false,
    deactivationReason: user.deactivationReason || null,
    role: user.role === 'admin' ? 'admin' : 'user',
    joinedAt: user.createdAt
      ? new Date(user.createdAt).toISOString().slice(0, 10)
      : '',
    assetsCount: extra.assetsCount ?? 0,
    rentalsCount: extra.rentalsCount ?? 0,
    ...serializePayout(user),
    ownerPayoutMethod: payout.ownerPayoutMethod,
    ownerPayoutDetails: payout.ownerPayoutDetails,
  };
};

const getAdminUsers = async (req, res) => {
  try {
    const users = await User.find(VERIFIED_USER_FILTER)
      .sort({ createdAt: -1 })
      .select(
        'name email phoneNumber isActive deactivationReason role createdAt payoutMethod payoutAccountName payoutNumber payoutBankName'
      );

    const userIds = users.map((u) => u._id);

    const [assetCounts, rentalCounts] = await Promise.all([
      Asset.aggregate([
        { $match: { owner: { $in: userIds } } },
        { $group: { _id: '$owner', count: { $sum: 1 } } },
      ]),
      Rental.aggregate([
        { $match: { tenant: { $in: userIds } } },
        { $group: { _id: '$tenant', count: { $sum: 1 } } },
      ]),
    ]);

    const assetsByOwner = Object.fromEntries(
      assetCounts.map((row) => [row._id.toString(), row.count])
    );
    const rentalsByTenant = Object.fromEntries(
      rentalCounts.map((row) => [row._id.toString(), row.count])
    );

    return res.status(200).json({
      users: users.map((user) =>
        serializeAdminUser(user, {
          assetsCount: assetsByOwner[user._id.toString()] || 0,
          rentalsCount: rentalsByTenant[user._id.toString()] || 0,
        })
      ),
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    return res.status(500).json({
      message: 'Server error while fetching users',
    });
  }
};

const getAdminUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Valid user id is required' });
    }

    const user = await User.findById(id).select(
      'name email phoneNumber isActive deactivationReason role createdAt payoutMethod payoutAccountName payoutNumber payoutBankName emailVerified'
    );

    if (!user || user.role === 'admin' || user.emailVerified === false) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [assetsCount, rentalsCount] = await Promise.all([
      Asset.countDocuments({ owner: user._id }),
      Rental.countDocuments({ tenant: user._id }),
    ]);

    return res.status(200).json({
      user: serializeAdminUser(user, { assetsCount, rentalsCount }),
    });
  } catch (error) {
    console.error('Get admin user error:', error);
    return res.status(500).json({
      message: 'Server error while fetching user',
    });
  }
};

const setAdminUserActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, deactivationReason } = req.body || {};

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Valid user id is required' });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be true or false' });
    }

    if (id === req.userId) {
      return res.status(400).json({
        message: 'You cannot change your own account status',
      });
    }

    const user = await User.findById(id);

    if (!user || user.role === 'admin' || user.emailVerified === false) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (isActive) {
      user.isActive = true;
      user.deactivationReason = undefined;
    } else {
      const allowed = ['fraud_scam', 'platform_misuse', 'non_payment'];
      if (!allowed.includes(deactivationReason)) {
        return res.status(400).json({
          message: 'Select a reason to deactivate this account',
        });
      }
      user.isActive = false;
      user.deactivationReason = deactivationReason;
    }

    await user.save();

    const [assetsCount, rentalsCount] = await Promise.all([
      Asset.countDocuments({ owner: user._id }),
      Rental.countDocuments({ tenant: user._id }),
    ]);

    return res.status(200).json({
      user: serializeAdminUser(user, { assetsCount, rentalsCount }),
    });
  } catch (error) {
    console.error('Set admin user active error:', error);
    return res.status(500).json({
      message: 'Server error while updating user status',
    });
  }
};

module.exports = {
  getAdminUsers,
  getAdminUserById,
  setAdminUserActive,
};
