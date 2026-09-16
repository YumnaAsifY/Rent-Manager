const Asset = require('../models/Asset');
const Rental = require('../models/Rental');
const RentalRequest = require('../models/RentalRequest');
const { getOwnerRentPaymentStatus } = require('../utils/billingCycle');
const { findValidCategoryName } = require('./assetCategoryController');

const formatDate = (value) => {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString('en-GB', {
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
    image: asset.image,
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

    if (!req.file) {
      return res.status(400).json({ message: 'Asset image is required' });
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
      image: `/uploads/${req.file.filename}`,
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
  makeAssetAvailable,
  deleteAsset,
  exploreAssets,
  getExploreAssetById,
};

