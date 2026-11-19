const mongoose = require('mongoose');
const Asset = require('../models/Asset');
const Rental = require('../models/Rental');
const RentalRequest = require('../models/RentalRequest');
const User = require('../models/User');
const { getOwnerRentPaymentStatus } = require('../utils/billingCycle');
const { parseCalendarDate } = require('../utils/calendarDate');
const { findValidCategoryName } = require('./assetCategoryController');
const { createNotification } = require('./notificationController');
const { sendTenantRemovalDisputeEmail } = require('../utils/sendEmail');

const formatDate = (value) => {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString('en-GB', {
    timeZone: 'Asia/Karachi',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const isLeaseEnded = (asset) => {
  if (asset.status !== 'Rented' || !asset.leaseEndDate) {
    return false;
  }

  const end = new Date(asset.leaseEndDate);
  end.setHours(23, 59, 59, 999);

  return end.getTime() < Date.now();
};

const serializeAsset = (asset) => {
  const leaseEnded = isLeaseEnded(asset);
  const tenantDoc =
    asset.tenant && typeof asset.tenant === 'object' ? asset.tenant : null;

  return {
    id: asset._id.toString(),
    name: asset.name,
    type: asset.type,
    location: asset.location,
    description: asset.description || '',
    image: asset.image || '',
    status: asset.status,
    monthlyRent: asset.monthlyRent ?? null,
    rent:
      asset.monthlyRent != null
        ? `Rs. ${Number(asset.monthlyRent).toLocaleString('en-PK')} / month`
        : null,
    leaseStatus:
      asset.status === 'Rented' ? (leaseEnded ? 'ended' : 'active') : null,
    leaseEnded,
    tenant: tenantDoc
      ? {
          id: tenantDoc._id.toString(),
          name: tenantDoc.name,
          phoneNumber: tenantDoc.phoneNumber,
        }
      : null,
    tenantName: tenantDoc ? tenantDoc.name : null,
    tenantPhone: tenantDoc ? tenantDoc.phoneNumber : null,
    leaseStartDate: asset.leaseStartDate || null,
    leaseEndDate: asset.leaseEndDate || null,
    startDate: formatDate(asset.leaseStartDate),
    endDate: formatDate(asset.leaseEndDate),
    rentPaymentStatus: null,
    rentPaymentLabel: null,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
};

const serializeExploreAsset = (asset, myRequestStatus = null) => {
  const ownerDoc =
    asset.owner && typeof asset.owner === 'object' ? asset.owner : null;
  const base = serializeAsset(asset);

  return {
    ...base,
    owner: ownerDoc
      ? {
          id: ownerDoc._id.toString(),
          name: ownerDoc.name,
          phoneNumber: ownerDoc.phoneNumber,
        }
      : null,
    ownerName: ownerDoc?.name || null,
    ownerPhone: ownerDoc?.phoneNumber || null,
    myRequestStatus,
    hasPendingRequest: myRequestStatus === 'Pending',
  };
};

const getPendingStatusMap = async (userId, assetIds) => {
  if (!assetIds.length) {
    return new Map();
  }

  const pendingRequests = await RentalRequest.find({
    tenant: userId,
    asset: { $in: assetIds },
    status: 'Pending',
  }).select('asset status');

  const map = new Map();
  pendingRequests.forEach((request) => {
    map.set(request.asset.toString(), request.status);
  });

  return map;
};

const exploreAssets = async (req, res) => {
  try {
    const assets = await Asset.find()
      .populate('owner', 'name phoneNumber')
      .sort({ createdAt: -1 });

    const statusMap = await getPendingStatusMap(
      req.userId,
      assets.map((asset) => asset._id)
    );

    return res.status(200).json({
      assets: assets.map((asset) =>
        serializeExploreAsset(asset, statusMap.get(asset._id.toString()) || null)
      ),
    });
  } catch (error) {
    console.error('Explore assets error:', error);

    return res.status(500).json({
      message: 'Server error while exploring assets',
    });
  }
};

const getExploreAssetById = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id).populate(
      'owner',
      'name phoneNumber'
    );

    if (!asset) {
      return res.status(404).json({
        message: 'Asset not found',
      });
    }

    const pending = await RentalRequest.findOne({
      asset: asset._id,
      tenant: req.userId,
      status: 'Pending',
    }).select('status');

    const ownerId =
      asset.owner && typeof asset.owner === 'object'
        ? asset.owner._id.toString()
        : asset.owner.toString();

    const serialized = serializeExploreAsset(
      asset,
      pending ? pending.status : null
    );
    serialized.isOwnedByMe = ownerId === req.userId.toString();

    return res.status(200).json({
      asset: serialized,
    });
  } catch (error) {
    console.error('Get explore asset by id error:', error);

    return res.status(500).json({
      message: 'Server error while fetching asset details',
    });
  }
};

const getMyAssets = async (req, res) => {
  try {
    const assets = await Asset.find({ owner: req.userId })
      .populate('tenant', 'name phoneNumber')
      .sort({ createdAt: -1 });

    const rentedIds = assets
      .filter((asset) => asset.status === 'Rented')
      .map((asset) => asset._id);

    const rentals = rentedIds.length
      ? await Rental.find({
          asset: { $in: rentedIds },
          isCurrent: true,
        })
      : [];

    const rentalByAsset = new Map(
      rentals.map((rental) => [rental.asset.toString(), rental])
    );

    const serialized = await Promise.all(
      assets.map(async (asset) => {
        const base = serializeAsset(asset);
        if (asset.status !== 'Rented') {
          return base;
        }

        const rental = rentalByAsset.get(asset._id.toString());
        if (!rental) {
          return base;
        }

        const paymentStatus = await getOwnerRentPaymentStatus(rental);
        return {
          ...base,
          rentPaymentStatus: paymentStatus.rentPaymentStatus,
          rentPaymentLabel: paymentStatus.rentPaymentLabel,
        };
      })
    );

    return res.status(200).json({
      assets: serialized,
    });
  } catch (error) {
    console.error('Get my assets error:', error);

    return res.status(500).json({
      message: 'Server error while fetching assets',
    });
  }
};

const getMyAssetsCount = async (req, res) => {
  try {
    const count = await Asset.countDocuments({ owner: req.userId });

    return res.status(200).json({ count });
  } catch (error) {
    console.error('Get my assets count error:', error);

    return res.status(500).json({
      message: 'Server error while counting assets',
    });
  }
};

const getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id).populate(
      'tenant',
      'name phoneNumber'
    );

    if (!asset) {
      return res.status(404).json({
        message: 'Asset not found',
      });
    }

    if (asset.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        message: 'You do not have permission to view this asset',
      });
    }

    const serialized = serializeAsset(asset);

    if (asset.status === 'Rented') {
      const rental = await Rental.findOne({
        asset: asset._id,
        isCurrent: true,
      });

      if (rental) {
        const paymentStatus = await getOwnerRentPaymentStatus(rental);
        serialized.rentPaymentStatus = paymentStatus.rentPaymentStatus;
        serialized.rentPaymentLabel = paymentStatus.rentPaymentLabel;
      }
    }

    return res.status(200).json({
      asset: serialized,
    });
  } catch (error) {
    console.error('Get asset by id error:', error);

    return res.status(500).json({
      message: 'Server error while fetching asset details',
    });
  }
};

const createAsset = async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const type = typeof req.body.type === 'string' ? req.body.type.trim() : '';
    const location =
      typeof req.body.location === 'string' ? req.body.location.trim() : '';
    const description =
      typeof req.body.description === 'string' ? req.body.description.trim() : '';

    if (!name) {
      return res.status(400).json({ message: 'Asset name is required' });
    }

    if (!type) {
      return res.status(400).json({ message: 'Asset type is required' });
    }

    const validType = await findValidCategoryName(type);
    if (!validType) {
      return res.status(400).json({ message: 'Invalid asset type' });
    }

    if (!location) {
      return res.status(400).json({ message: 'Location is required' });
    }

    const rentRaw =
      req.body.monthlyRent !== undefined && req.body.monthlyRent !== null
        ? String(req.body.monthlyRent).trim()
        : '';

    if (!rentRaw) {
      return res.status(400).json({ message: 'Rent is required' });
    }

    const parsedRent = Number(rentRaw.replace(/,/g, ''));

    if (Number.isNaN(parsedRent) || parsedRent <= 0) {
      return res.status(400).json({
        message: 'Monthly rent must be a valid number',
      });
    }

    const monthlyRent = parsedRent;

    const asset = await Asset.create({
      name,
      type: validType,
      location,
      description,
      image: req.file ? `/uploads/${req.file.filename}` : '',
      owner: req.userId,
      status: 'Available',
      monthlyRent,
      tenant: null,
      leaseStartDate: null,
      leaseEndDate: null,
    });

    return res.status(201).json({
      message: 'Asset created successfully',
      asset: serializeAsset(asset),
    });
  } catch (error) {
    console.error('Create asset error:', error);

    return res.status(500).json({
      message: 'Server error while creating asset',
    });
  }
};

const updateAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id).populate(
      'tenant',
      'name phoneNumber'
    );

    if (!asset) {
      return res.status(404).json({
        message: 'Asset not found',
      });
    }

    if (asset.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        message: 'You do not have permission to update this asset',
      });
    }

    if (asset.status !== 'Available') {
      return res.status(400).json({
        message: 'Only available assets can be edited',
      });
    }

    const name =
      typeof req.body.name === 'string' ? req.body.name.trim() : asset.name;
    const type =
      typeof req.body.type === 'string' ? req.body.type.trim() : asset.type;
    const location =
      typeof req.body.location === 'string'
        ? req.body.location.trim()
        : asset.location;
    const description =
      typeof req.body.description === 'string'
        ? req.body.description.trim()
        : asset.description || '';

    if (!name) {
      return res.status(400).json({ message: 'Asset name is required' });
    }

    if (!type) {
      return res.status(400).json({ message: 'Asset type is required' });
    }

    const validType = await findValidCategoryName(type);
    if (!validType && type !== asset.type) {
      return res.status(400).json({ message: 'Invalid asset type' });
    }

    if (!location) {
      return res.status(400).json({ message: 'Location is required' });
    }

    if (req.body.monthlyRent !== undefined && req.body.monthlyRent !== null) {
      const rentRaw = String(req.body.monthlyRent).trim();
      if (rentRaw) {
        const parsedRent = Number(rentRaw.replace(/,/g, ''));
        if (Number.isNaN(parsedRent) || parsedRent <= 0) {
          return res.status(400).json({
            message: 'Monthly rent must be a valid number',
          });
        }
        asset.monthlyRent = parsedRent;
      }
    }

    asset.name = name;
    asset.type = validType || asset.type;
    asset.location = location;
    asset.description = description;

    if (req.file) {
      asset.image = `/uploads/${req.file.filename}`;
    }

    await asset.save();

    return res.status(200).json({
      message: 'Asset updated successfully',
      asset: serializeAsset(asset),
    });
  } catch (error) {
    console.error('Update asset error:', error);

    return res.status(500).json({
      message: 'Server error while updating asset',
    });
  }
};

const assignAssetToTenant = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!email) {
      await session.abortTransaction();
      return res.status(400).json({
        message: "Please enter tenant's email",
      });
    }

    const tenant = await User.findOne({ email }).session(session);

    if (!tenant || tenant.role === 'admin') {
      await session.abortTransaction();
      return res.status(404).json({
        message: 'This user is not registered in the app',
      });
    }

    if (tenant._id.toString() === req.userId.toString()) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'You cannot assign an asset to yourself',
      });
    }

    const asset = await Asset.findById(req.params.id).session(session);

    if (!asset) {
      await session.abortTransaction();
      return res.status(404).json({
        message: 'Asset not found',
      });
    }

    if (asset.owner.toString() !== req.userId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({
        message: 'You do not have permission to assign this asset',
      });
    }

    if (asset.status !== 'Available') {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Only available assets can be assigned',
      });
    }

    const leaseStartDate = parseCalendarDate(req.body.leaseStartDate);
    const leaseEndDate = parseCalendarDate(req.body.leaseEndDate);

    if (!leaseStartDate) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Please select start date',
      });
    }

    if (!leaseEndDate) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Please select end date',
      });
    }

    if (leaseEndDate.getTime() <= leaseStartDate.getTime()) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Lease end date must be after the start date',
      });
    }

    asset.status = 'Rented';
    asset.tenant = tenant._id;
    asset.leaseStartDate = leaseStartDate;
    asset.leaseEndDate = leaseEndDate;
    await asset.save({ session });

    await Rental.create(
      [
        {
          asset: asset._id,
          owner: asset.owner,
          tenant: tenant._id,
          leaseStartDate,
          leaseEndDate,
          monthlyRent: asset.monthlyRent ?? null,
          isCurrent: true,
        },
      ],
      { session }
    );

    const otherPending = await RentalRequest.find({
      asset: asset._id,
      status: 'Pending',
    })
      .select('_id tenant')
      .session(session);

    if (otherPending.length > 0) {
      await RentalRequest.updateMany(
        {
          asset: asset._id,
          status: 'Pending',
        },
        {
          $set: { status: 'Rejected' },
        },
        { session }
      );
    }

    await session.commitTransaction();

    await createNotification({
      recipient: tenant._id,
      type: 'asset_assigned',
      title: 'Asset assigned',
      message: `${asset.name} has been assigned to you.`,
      relatedAsset: asset._id,
      relatedRental: null,
      audience: 'tenant',
    });

    const notifiedTenants = new Set();
    for (const other of otherPending) {
      const tenantId = other.tenant.toString();
      if (notifiedTenants.has(tenantId) || tenantId === tenant._id.toString()) {
        continue;
      }
      notifiedTenants.add(tenantId);
      await createNotification({
        recipient: other.tenant,
        type: 'rental_request_rejected',
        title: 'Request Rejected',
        message: `Your rental request for ${asset.name} was closed because the asset is no longer available.`,
        relatedRequest: other._id,
        relatedAsset: asset._id,
      });
    }

    const populated = await Asset.findById(asset._id).populate(
      'tenant',
      'name phoneNumber'
    );

    return res.status(200).json({
      message: 'Asset has been assigned to the tenant',
      asset: serializeAsset(populated),
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Assign asset error:', error);

    return res.status(500).json({
      message: 'Server error while assigning asset',
    });
  } finally {
    session.endSession();
  }
};

const makeAssetAvailable = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id).populate(
      'tenant',
      'name phoneNumber'
    );

    if (!asset) {
      return res.status(404).json({
        message: 'Asset not found',
      });
    }

    if (asset.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        message: 'You do not have permission to update this asset',
      });
    }

    if (asset.status !== 'Rented') {
      return res.status(400).json({
        message: 'Only rented assets can be made available',
      });
    }

    if (!isLeaseEnded(asset)) {
      return res.status(400).json({
        message: 'Asset can only be made available after the lease has ended',
      });
    }

    // Clear current asset rental state only. Keep Rental history for My Rentals.
    const previousTenantId = asset.tenant ? asset.tenant._id || asset.tenant : null;

    asset.status = 'Available';
    asset.tenant = null;
    asset.leaseStartDate = null;
    asset.leaseEndDate = null;
    await asset.save();

    if (previousTenantId) {
      await Rental.updateMany(
        {
          asset: asset._id,
          tenant: previousTenantId,
          isCurrent: true,
        },
        {
          $set: { isCurrent: false },
        }
      );
    }

    return res.status(200).json({
      message: 'Asset is now available',
      asset: serializeAsset(asset),
    });
  } catch (error) {
    console.error('Make asset available error:', error);

    return res.status(500).json({
      message: 'Server error while making asset available',
    });
  }
};

const removeTenantFromAsset = async (req, res) => {
  try {
    const reason = String(req.body.reason || '').trim();

    if (!reason) {
      return res.status(400).json({
        message: 'Please provide a reason',
      });
    }

    const asset = await Asset.findById(req.params.id).populate(
      'tenant',
      'name email phoneNumber'
    );

    if (!asset) {
      return res.status(404).json({
        message: 'Asset not found',
      });
    }

    if (asset.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        message: 'You do not have permission to update this asset',
      });
    }

    if (asset.status !== 'Rented' || !asset.tenant) {
      return res.status(400).json({
        message: 'This asset has no tenant to remove',
      });
    }

    if (isLeaseEnded(asset)) {
      return res.status(400).json({
        message:
          'This lease has ended. Use Make Available instead of removing the tenant.',
      });
    }

    const tenantId = asset.tenant._id || asset.tenant;
    const tenantName = asset.tenant.name || 'Tenant';
    const tenantEmail = asset.tenant.email || '';
    const tenantPhone = asset.tenant.phoneNumber || '';
    const owner = await User.findById(req.userId).select(
      'name email phoneNumber'
    );
    const ownerName = owner?.name || 'The owner';
    const ownerEmail = owner?.email || '';
    const ownerPhone = owner?.phoneNumber || '';
    const assetName = asset.name;

    const currentRental = await Rental.findOne({
      asset: asset._id,
      tenant: tenantId,
      isCurrent: true,
    });

    let rentCycleStatus = 'Unpaid';
    let daysAfterLeaseStart = null;
    const removedAt = new Date();
    const leaseStartForDays =
      currentRental?.leaseStartDate || asset.leaseStartDate;

    if (leaseStartForDays) {
      const start = new Date(leaseStartForDays);
      start.setHours(0, 0, 0, 0);
      const removedDay = new Date(removedAt);
      removedDay.setHours(0, 0, 0, 0);
      daysAfterLeaseStart = Math.max(
        0,
        Math.round((removedDay.getTime() - start.getTime()) / 86400000)
      );
    }

    if (currentRental) {
      const paymentStatus = await getOwnerRentPaymentStatus(currentRental);
      const label = String(paymentStatus.rentPaymentLabel || '').toLowerCase();
      rentCycleStatus =
        label === 'paid' || label === 'settled' ? 'Paid' : 'Unpaid';

      currentRental.removedAt = removedAt;
      currentRental.removalReason = reason;
      currentRental.isCurrent = false;
      await currentRental.save();
    }

    asset.status = 'Available';
    asset.tenant = null;
    asset.leaseStartDate = null;
    asset.leaseEndDate = null;
    await asset.save();

    await createNotification({
      recipient: tenantId,
      type: 'tenancy_cancelled',
      title: 'Rental removed',
      message: `${ownerName}, owner of ${assetName}, has removed you from this rental. Reason: ${reason}`,
      relatedAsset: asset._id,
      relatedRental: currentRental?._id || null,
      audience: 'tenant',
      cancellationReason: reason,
      cancellationOwnerName: ownerName,
      cancellationAssetName: assetName,
      cancellationAssetType: asset.type || '',
      cancellationAssetLocation: asset.location || '',
    });

    try {
      await sendTenantRemovalDisputeEmail({
        tenantName,
        tenantEmail,
        tenantPhone,
        ownerName,
        ownerEmail,
        ownerPhone,
        assetName,
        assetType: asset.type || '',
        assetLocation: asset.location || '',
        reason,
        rentCycleStatus,
        daysAfterLeaseStart,
      });
    } catch (emailError) {
      console.error('Tenant-removal dispute email error:', emailError);
    }

    const admins = await User.find({
      role: 'admin',
      isActive: { $ne: false },
    }).select('_id');

    await Promise.all(
      admins.map((admin) =>
        createNotification({
          recipient: admin._id,
          type: 'admin_dispute_email',
          title: 'You have received a dispute email',
          message: `${ownerName} removed ${tenantName} from ${assetName}. Reason: ${reason}`,
          relatedAsset: asset._id,
          relatedRental: currentRental?._id || null,
          cancellationReason: reason,
          cancellationOwnerName: ownerName,
          cancellationAssetName: assetName,
          cancellationAssetType: asset.type || '',
          cancellationAssetLocation: asset.location || '',
        })
      )
    );

    return res.status(200).json({
      message: 'Tenant has been removed',
      asset: serializeAsset(asset),
    });
  } catch (error) {
    console.error('Remove tenant error:', error);

    return res.status(500).json({
      message: 'Server error while removing tenant',
    });
  }
};

const deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);

    if (!asset) {
      return res.status(404).json({
        message: 'Asset not found',
      });
    }

    if (asset.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        message: 'You do not have permission to delete this asset',
      });
    }

    if (asset.status !== 'Available') {
      return res.status(400).json({
        message: 'Only available assets can be deleted',
      });
    }

    // Remove requests for this asset so Explore/Requests stay consistent.
    await RentalRequest.deleteMany({ asset: asset._id });

    await asset.deleteOne();

    return res.status(200).json({
      message: 'Asset deleted successfully',
    });
  } catch (error) {
    console.error('Delete asset error:', error);

    return res.status(500).json({
      message: 'Server error while deleting asset',
    });
  }
};

module.exports = {
  getMyAssets,
  getMyAssetsCount,
  getAssetById,
  createAsset,
  updateAsset,
  assignAssetToTenant,
  makeAssetAvailable,
  removeTenantFromAsset,
  deleteAsset,
  exploreAssets,
  getExploreAssetById,
};

