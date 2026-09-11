const mongoose = require('mongoose');
const Rental = require('../models/Rental');

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

const getLeaseEndBoundary = (leaseEndDate) => {
  const end = new Date(leaseEndDate);
  end.setHours(23, 59, 59, 999);
  return end;
};

const getDisplayStatus = (leaseEndDate) => {
  if (!leaseEndDate) {
    return 'Expired';
  }

  return getLeaseEndBoundary(leaseEndDate).getTime() >= Date.now()
    ? 'Active'
    : 'Expired';
};

const getStartOfToday = () => {
  const next = new Date();
  next.setHours(0, 0, 0, 0);
  return next;
};

const expiredLeaseQuery = () => ({
  $or: [{ leaseEndDate: null }, { leaseEndDate: { $lt: getStartOfToday() } }],
});

const serializeRental = (rental) => {
  const assetDoc =
    rental.asset && typeof rental.asset === 'object' ? rental.asset : null;
  const ownerDoc =
    rental.owner && typeof rental.owner === 'object' ? rental.owner : null;

  const monthlyRent =
    rental.monthlyRent != null
      ? rental.monthlyRent
      : assetDoc?.monthlyRent != null
        ? assetDoc.monthlyRent
        : null;

  const status = getDisplayStatus(rental.leaseEndDate);

  return {
    id: rental._id.toString(),
    status,
    leaseStartDate: rental.leaseStartDate,
    leaseEndDate: rental.leaseEndDate,
    startDate: formatDate(rental.leaseStartDate),
    endDate: formatDate(rental.leaseEndDate),
    isCurrent: Boolean(rental.isCurrent),
    monthlyRent,
    rent:
      monthlyRent != null
        ? `Rs. ${Number(monthlyRent).toLocaleString('en-PK')} / month`
        : null,
    asset: assetDoc
      ? {
          id: assetDoc._id.toString(),
          name: assetDoc.name,
          type: assetDoc.type,
          location: assetDoc.location,
          description: assetDoc.description || '',
          image: assetDoc.image,
          monthlyRent: assetDoc.monthlyRent ?? null,
        }
      : null,
    // Flat fields for existing list/detail UI
    name: assetDoc?.name || 'Unknown asset',
    type: assetDoc?.type || null,
    location: assetDoc?.location || null,
    description: assetDoc?.description || '',
    image: assetDoc?.image || null,
    owner: ownerDoc
      ? {
          id: ownerDoc._id.toString(),
          name: ownerDoc.name,
          phoneNumber: ownerDoc.phoneNumber,
        }
      : null,
    ownerName: ownerDoc?.name || null,
    ownerPhone: ownerDoc?.phoneNumber || null,
    createdAt: rental.createdAt,
    updatedAt: rental.updatedAt,
  };
};

const populateRentalQuery = (query) =>
  query
    .populate('asset', 'name type location description image monthlyRent')
    .populate('owner', 'name phoneNumber');

const getMyRentals = async (req, res) => {
  try {
    const rentals = await populateRentalQuery(
      Rental.find({
        tenant: req.userId,
        tenantDeleted: { $ne: true },
      }).sort({ createdAt: -1 })
    );

    return res.status(200).json({
      rentals: rentals.map(serializeRental),
    });
  } catch (error) {
    console.error('Get my rentals error:', error);

    return res.status(500).json({
      message: 'Server error while fetching rentals',
    });
  }
};

const getMyRentalsCount = async (req, res) => {
  try {
    const count = await Rental.countDocuments({
      tenant: req.userId,
      tenantDeleted: { $ne: true },
    });

    return res.status(200).json({ count });
  } catch (error) {
    console.error('Get my rentals count error:', error);

    return res.status(500).json({
      message: 'Server error while counting rentals',
    });
  }
};

const getRentalById = async (req, res) => {
  try {
    const rental = await populateRentalQuery(Rental.findById(req.params.id));

    if (!rental) {
      return res.status(404).json({
        message: 'Rental not found',
      });
    }

    if (rental.tenant.toString() !== req.userId.toString()) {
      return res.status(403).json({
        message: 'You do not have permission to view this rental',
      });
    }

    if (rental.tenantDeleted) {
      return res.status(404).json({
        message: 'Rental not found',
      });
    }

    return res.status(200).json({
      rental: serializeRental(rental),
    });
  } catch (error) {
    console.error('Get rental by id error:', error);

    return res.status(500).json({
      message: 'Server error while fetching rental details',
    });
  }
};

const hideExpiredRentals = async (req, res) => {
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
        message: 'Select at least one expired rental to remove',
      });
    }

    const result = await Rental.updateMany(
      {
        _id: { $in: ids },
        tenant: req.userId,
        tenantDeleted: { $ne: true },
        ...expiredLeaseQuery(),
      },
      { $set: { tenantDeleted: true } }
    );

    if (!result.modifiedCount) {
      return res.status(400).json({
        message: 'Only expired rentals can be removed from My Rentals',
      });
    }

    return res.status(200).json({
      message: 'Expired rentals removed from your list',
    });
  } catch (error) {
    console.error('Hide expired rentals error:', error);

    return res.status(500).json({
      message: 'Server error while removing rentals',
    });
  }
};

module.exports = {
  getMyRentals,
  getMyRentalsCount,
  getRentalById,
  hideExpiredRentals,
  getDisplayStatus,
  serializeRental,
};
