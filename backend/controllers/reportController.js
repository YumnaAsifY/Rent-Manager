const mongoose = require('mongoose');

const Report = require('../models/Report');
const Asset = require('../models/Asset');
const Rental = require('../models/Rental');
const RentalRequest = require('../models/RentalRequest');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

const TYPE_REASON = {
  fake_property: 'fraud_scam',
  spam_misuse: 'platform_misuse',
  unpaid_rent: 'non_payment',
};

const serializeReport = (report) => {
  const reporter =
    report.reporter && typeof report.reporter === 'object'
      ? report.reporter
      : null;
  const reported =
    report.reportedUser && typeof report.reportedUser === 'object'
      ? report.reportedUser
      : null;

  return {
    id: report._id.toString(),
    type: report.type,
    status: report.status,
    reporterName: reporter?.name || 'Unknown',
    reportedUserId: reported?._id?.toString() || String(report.reportedUser),
    reportedUserName: reported?.name || 'Unknown',
    createdAt: report.createdAt,
  };
};

const hasOpenReport = async (filter) => {
  return Report.findOne({
    ...filter,
    status: { $in: ['pending', 'warned'] },
  }).select('_id');
};

const createReport = async (req, res) => {
  try {
    const type = req.body?.type;
    const assetId = req.body?.assetId;
    const requestId = req.body?.requestId;

    if (!['fake_property', 'spam_misuse', 'unpaid_rent'].includes(type)) {
      return res.status(400).json({ message: 'Invalid report type' });
    }

    if (type === 'fake_property') {
      if (!assetId || !mongoose.Types.ObjectId.isValid(assetId)) {
        return res.status(400).json({ message: 'Valid asset is required' });
      }

      const asset = await Asset.findById(assetId).select('owner');
      if (!asset) {
        return res.status(404).json({ message: 'Asset not found' });
      }

      if (asset.owner.toString() === req.userId.toString()) {
        return res.status(400).json({ message: 'You cannot report your own listing' });
      }

      const duplicate = await hasOpenReport({
        reporter: req.userId,
        type,
        relatedAsset: asset._id,
      });
      if (duplicate) {
        return res.status(400).json({ message: 'You already reported this listing' });
      }

      const report = await Report.create({
        reporter: req.userId,
        reportedUser: asset.owner,
        type,
        relatedAsset: asset._id,
      });

      return res.status(201).json({ message: 'Report submitted', reportId: report._id });
    }

    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: 'Valid request is required' });
    }

    const request = await RentalRequest.findById(requestId).select(
      'owner tenant status'
    );
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Only the owner can submit this report' });
    }

    if (type === 'unpaid_rent' && request.status !== 'Accepted') {
      return res.status(400).json({
        message: 'Unpaid rent can only be reported for an accepted request',
      });
    }

    const rental = await Rental.findOne({ rentalRequest: request._id }).select('_id');
    if (type === 'unpaid_rent' && !rental) {
      return res.status(400).json({ message: 'No rental found for this request' });
    }

    const duplicate = await hasOpenReport({
      reporter: req.userId,
      type,
      relatedRequest: request._id,
    });
    if (duplicate) {
      return res.status(400).json({ message: 'You already submitted this report' });
    }

    const report = await Report.create({
      reporter: req.userId,
      reportedUser: request.tenant,
      type,
      relatedRequest: request._id,
    });

    return res.status(201).json({ message: 'Report submitted', reportId: report._id });
  } catch (error) {
    console.error('Create report error:', error);
    return res.status(500).json({ message: 'Server error while submitting report' });
  }
};

const getAdminReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .sort({ createdAt: -1 })
      .populate('reporter', 'name')
      .populate('reportedUser', 'name');

    return res.status(200).json({
      reports: reports.map(serializeReport),
    });
  } catch (error) {
    console.error('Get admin reports error:', error);
    return res.status(500).json({ message: 'Server error while fetching reports' });
  }
};

const reviewAdminReport = async (req, res) => {
  try {
    const { id } = req.params;
    const action = req.body?.action;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Valid report id is required' });
    }

    if (!['dismiss', 'warn', 'deactivate'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (report.status === 'dismissed' || report.status === 'resolved') {
      return res.status(400).json({ message: 'This report is already closed' });
    }

    if (action === 'warn' && report.status === 'warned') {
      return res.status(400).json({ message: 'A warning was already sent' });
    }

    if (action === 'dismiss') {
      report.status = 'dismissed';
      await report.save();
      return res.status(200).json({ report: serializeReport(report) });
    }

    if (action === 'warn') {
      if (report.type !== 'unpaid_rent') {
        return res.status(400).json({
          message: 'Warning is only used for unpaid rent reports',
        });
      }

      await createNotification({
        recipient: report.reportedUser,
        type: 'payment_unpaid_warning',
        title: 'Payment warning',
        message:
          'Your rent is still unpaid. If you do not pay, your account may be blocked.',
        relatedRequest: report.relatedRequest,
        relatedAsset: report.relatedAsset,
        audience: 'tenant',
      });

      report.status = 'warned';
      await report.save();
      return res.status(200).json({ report: serializeReport(report) });
    }

    const user = await User.findById(report.reportedUser);
    if (!user || user.role === 'admin') {
      return res.status(400).json({ message: 'This account cannot be deactivated' });
    }

    if (user._id.toString() === req.userId.toString()) {
      return res.status(400).json({ message: 'You cannot change your own account status' });
    }

    user.isActive = false;
    user.deactivationReason = TYPE_REASON[report.type];
    await user.save();

    report.status = 'resolved';
    await report.save();

    return res.status(200).json({ report: serializeReport(report) });
  } catch (error) {
    console.error('Review report error:', error);
    return res.status(500).json({ message: 'Server error while updating report' });
  }
};

module.exports = {
  createReport,
  getAdminReports,
  reviewAdminReport,
};
