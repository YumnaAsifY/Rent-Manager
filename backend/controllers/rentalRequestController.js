const mongoose = require('mongoose');
const RentalRequest = require('../models/RentalRequest');
const Asset = require('../models/Asset');
const Rental = require('../models/Rental');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

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

const parseDateInput = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getIdString = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'object' && value._id) {
    return value._id.toString();
  }

  return value.toString();
};

const serializeRequest = (request) => {
  const assetDoc =
    request.asset && typeof request.asset === 'object' ? request.asset : null;
  const ownerDoc =
    request.owner && typeof request.owner === 'object' ? request.owner : null;
  const tenantDoc =
    request.tenant && typeof request.tenant === 'object' ? request.tenant : null;

  const monthlyRent = assetDoc?.monthlyRent ?? null;

  return {
    id: request._id.toString(),
    status: request.status,
    leaseStartDate: request.leaseStartDate,
    leaseEndDate: request.leaseEndDate,
    startDate: formatDate(request.leaseStartDate),
    endDate: formatDate(request.leaseEndDate),
    asset: assetDoc
      ? {
          id: assetDoc._id.toString(),
          name: assetDoc.name,
          type: assetDoc.type,
          location: assetDoc.location,
          description: assetDoc.description || '',
          image: assetDoc.image,
          status: assetDoc.status,
          monthlyRent,
          rent:
            monthlyRent != null
              ? `Rs. ${Number(monthlyRent).toLocaleString('en-PK')} / month`
              : null,
        }
      : null,
    assetName: assetDoc?.name || 'Unknown asset',
    assetType: assetDoc?.type || null,
    location: assetDoc?.location || null,
    description: assetDoc?.description || '',
    image: assetDoc?.image || null,
    rent:
      monthlyRent != null
        ? `Rs. ${Number(monthlyRent).toLocaleString('en-PK')} / month`
        : null,
    owner: ownerDoc
      ? {
          id: ownerDoc._id.toString(),
          name: ownerDoc.name,
          phoneNumber: ownerDoc.phoneNumber,
        }
      : null,
    ownerName: ownerDoc?.name || null,
    ownerPhone: ownerDoc?.phoneNumber || null,
    tenant: tenantDoc
      ? {
          id: tenantDoc._id.toString(),
          name: tenantDoc.name,
          phoneNumber: tenantDoc.phoneNumber,
        }
      : null,
    tenantName: tenantDoc?.name || null,
    tenantPhone: tenantDoc?.phoneNumber || null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
};

const populateRequest = (query) =>
  query
    .populate(
      'asset',
      'name type location description image status monthlyRent owner'
    )
    .populate('owner', 'name phoneNumber')
    .populate('tenant', 'name phoneNumber');

const createRentalRequest = async (req, res) => {
  try {
    const assetId =
      typeof req.body.assetId === 'string' ? req.body.assetId.trim() : '';
    const leaseStartDate = parseDateInput(req.body.leaseStartDate);
    const leaseEndDate = parseDateInput(req.body.leaseEndDate);

    if (!assetId) {
      return res.status(400).json({ message: 'Asset is required' });
    }

    if (!leaseStartDate) {
      return res.status(400).json({ message: 'Lease start date is required' });
    }

    if (!leaseEndDate) {
      return res.status(400).json({ message: 'Lease end date is required' });
    }

    if (startOfDay(leaseEndDate).getTime() <= startOfDay(leaseStartDate).getTime()) {
      return res.status(400).json({
        message: 'Lease end date must be after the start date',
      });
    }

    const asset = await Asset.findById(assetId);

    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    if (asset.status !== 'Available') {
      return res.status(400).json({
        message: 'This asset is not available for rental requests',
      });
    }

    if (asset.owner.toString() === req.userId.toString()) {
      return res.status(400).json({
        message: 'You cannot request your own asset',
      });
    }

    const existingPending = await RentalRequest.findOne({
      asset: asset._id,
      tenant: req.userId,
      status: 'Pending',
    });

    if (existingPending) {
      return res.status(400).json({
        message: 'You already have a pending request for this asset.',
      });
    }

    const request = await RentalRequest.create({
      asset: asset._id,
      owner: asset.owner,
      tenant: req.userId,
      leaseStartDate: startOfDay(leaseStartDate),
      leaseEndDate: startOfDay(leaseEndDate),
      status: 'Pending',
    });

    const tenantUser = await User.findById(req.userId).select('name');
    const tenantName = tenantUser?.name || 'A tenant';

    await createNotification({
      recipient: asset.owner,
      type: 'rental_request_received',
      title: 'New Rental Request',
      message: `${tenantName} sent a rental request for ${asset.name}.`,
      relatedRequest: request._id,
      relatedAsset: asset._id,
    });

    const populated = await populateRequest(RentalRequest.findById(request._id));

    return res.status(201).json({
      message: 'Rental request sent successfully',
      request: serializeRequest(populated),
    });
  } catch (error) {
    console.error('Create rental request error:', error);

    return res.status(500).json({
      message: 'Server error while creating rental request',
    });
  }
};

const getMyRentalRequests = async (req, res) => {
  try {
    const requests = await populateRequest(
      RentalRequest.find({
        tenant: req.userId,
        tenantDeleted: { $ne: true },
      }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      requests: requests.map(serializeRequest),
    });
  } catch (error) {
    console.error('Get my rental requests error:', error);

    return res.status(500).json({
      message: 'Server error while fetching rental requests',
    });
  }
};

const getOwnerRentalRequests = async (req, res) => {
  try {
    const requests = await populateRequest(
      RentalRequest.find({
        owner: req.userId,
        ownerDeleted: { $ne: true },
      }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      requests: requests.map(serializeRequest),
    });
  } catch (error) {
    console.error('Get owner rental requests error:', error);

    return res.status(500).json({
      message: 'Server error while fetching owner rental requests',
    });
  }
};

const getMyPendingRequestsCount = async (req, res) => {
  try {
    const [sentPending, incomingPending] = await Promise.all([
      RentalRequest.countDocuments({
        tenant: req.userId,
        status: 'Pending',
        tenantDeleted: { $ne: true },
      }),
      RentalRequest.countDocuments({
        owner: req.userId,
        status: 'Pending',
        ownerDeleted: { $ne: true },
      }),
    ]);

    return res.status(200).json({
      count: sentPending + incomingPending,
      sentPending,
      incomingPending,
    });
  } catch (error) {
    console.error('Get pending requests count error:', error);

    return res.status(500).json({
      message: 'Server error while counting rental requests',
    });
  }
};

const getRentalRequestById = async (req, res) => {
  try {
    const request = await populateRequest(
      RentalRequest.findById(req.params.id)
    );

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const tenantId = getIdString(request.tenant);
    const ownerId = getIdString(request.owner);
    const userId = req.userId.toString();

    if (tenantId !== userId && ownerId !== userId) {
      return res.status(403).json({
        message: 'You do not have permission to view this request',
      });
    }

    return res.status(200).json({
      request: {
        ...serializeRequest(request),
        viewerRole: ownerId === userId ? 'owner' : 'tenant',
      },
    });
  } catch (error) {
    console.error('Get rental request by id error:', error);

    return res.status(500).json({
      message: 'Server error while fetching rental request',
    });
  }
};

const acceptRentalRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const request = await RentalRequest.findById(req.params.id).session(session);

    if (!request) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.owner.toString() !== req.userId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({
        message: 'Only the asset owner can accept this request',
      });
    }

    if (request.status !== 'Pending') {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Only pending requests can be accepted',
      });
    }

    const existingRental = await Rental.findOne({
      rentalRequest: request._id,
    }).session(session);

    if (existingRental) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'A rental already exists for this request',
      });
    }

    const asset = await Asset.findOneAndUpdate(
      {
        _id: request.asset,
        status: 'Available',
        owner: req.userId,
      },
      {
        $set: {
          status: 'Rented',
          tenant: request.tenant,
          leaseStartDate: request.leaseStartDate,
          leaseEndDate: request.leaseEndDate,
        },
      },
      {
        new: true,
        session,
      }
    );

    if (!asset) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'This asset is no longer available for acceptance',
      });
    }

    request.status = 'Accepted';
    await request.save({ session });

    await Rental.create(
      [
        {
          asset: asset._id,
          owner: asset.owner,
          tenant: request.tenant,
          leaseStartDate: request.leaseStartDate,
          leaseEndDate: request.leaseEndDate,
          monthlyRent: asset.monthlyRent ?? null,
          rentalRequest: request._id,
          isCurrent: true,
        },
      ],
      { session }
    );

    const otherPending = await RentalRequest.find({
      asset: asset._id,
      status: 'Pending',
      _id: { $ne: request._id },
    })
      .select('_id tenant')
      .session(session);

    await RentalRequest.updateMany(
      {
        asset: asset._id,
        status: 'Pending',
        _id: { $ne: request._id },
      },
      {
        $set: { status: 'Rejected' },
      },
      { session }
    );

    await session.commitTransaction();

    await createNotification({
      recipient: request.tenant,
      type: 'rental_request_accepted',
      title: 'Request Accepted',
      message: `Your rental request for ${asset.name} has been accepted.`,
      relatedRequest: request._id,
      relatedAsset: asset._id,
    });

    const notifiedTenants = new Set();
    for (const other of otherPending) {
      const tenantId = other.tenant.toString();
      if (notifiedTenants.has(tenantId)) {
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

    const populated = await populateRequest(RentalRequest.findById(request._id));

    return res.status(200).json({
      message: 'Rental request accepted successfully',
      request: {
        ...serializeRequest(populated),
        viewerRole: 'owner',
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Accept rental request error:', error);

    return res.status(500).json({
      message: 'Server error while accepting rental request',
    });
  } finally {
    session.endSession();
  }
};

const rejectRentalRequest = async (req, res) => {
  try {
    const request = await RentalRequest.findById(req.params.id).populate(
      'asset',
      'name'
    );

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        message: 'Only the asset owner can reject this request',
      });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({
        message: 'Only pending requests can be rejected',
      });
    }

    request.status = 'Rejected';
    await request.save();

    const assetName =
      request.asset && typeof request.asset === 'object'
        ? request.asset.name
        : 'the asset';

    await createNotification({
      recipient: request.tenant,
      type: 'rental_request_rejected',
      title: 'Request Rejected',
      message: `Your rental request for ${assetName} has been rejected.`,
      relatedRequest: request._id,
      relatedAsset: request.asset?._id || request.asset,
    });

    const populated = await populateRequest(RentalRequest.findById(request._id));

    return res.status(200).json({
      message: 'Rental request rejected successfully',
      request: {
        ...serializeRequest(populated),
        viewerRole: 'owner',
      },
    });
  } catch (error) {
    console.error('Reject rental request error:', error);

    return res.status(500).json({
      message: 'Server error while rejecting rental request',
    });
  }
};

const hideRentalRequest = async (req, res) => {
  try {
    const request = await RentalRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const userId = req.userId.toString();
    const isOwner = request.owner.toString() === userId;
    const isTenant = request.tenant.toString() === userId;

    if (!isOwner && !isTenant) {
      return res.status(403).json({
        message: 'You do not have permission to remove this request',
      });
    }

    if (isOwner) {
      request.ownerDeleted = true;
    } else {
      request.tenantDeleted = true;
    }

    await request.save();

    return res.status(200).json({
      message: 'Request removed from your list',
    });
  } catch (error) {
    console.error('Hide rental request error:', error);

    return res.status(500).json({
      message: 'Server error while removing rental request',
    });
  }
};

const hideRentalRequests = async (req, res) => {
  try {
    const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const ids = [
      ...new Set(
        rawIds.filter(
          (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)
        )
      ),
    ];

    if (ids.length === 0) {
      return res.status(400).json({
        message: 'Select at least one request to remove',
      });
    }

    await RentalRequest.updateMany(
      { _id: { $in: ids }, owner: req.userId },
      { $set: { ownerDeleted: true } }
    );

    await RentalRequest.updateMany(
      { _id: { $in: ids }, tenant: req.userId },
      { $set: { tenantDeleted: true } }
    );

    return res.status(200).json({
      message: 'Requests removed from your list',
    });
  } catch (error) {
    console.error('Hide rental requests error:', error);

    return res.status(500).json({
      message: 'Server error while removing rental requests',
    });
  }
};

module.exports = {
  createRentalRequest,
  getMyRentalRequests,
  getOwnerRentalRequests,
  getMyPendingRequestsCount,
  getRentalRequestById,
  acceptRentalRequest,
  rejectRentalRequest,
  hideRentalRequest,
  hideRentalRequests,
};
