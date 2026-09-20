const Notification = require('../models/Notification');

const createNotification = async ({
  recipient,
  type,
  title,
  message,
  relatedRequest = null,
  relatedAsset = null,
  relatedRental = null,
  relatedPayment = null,
  scheduleKey,
  audience,
  cancellationReason,
  cancellationOwnerName,
  cancellationAssetName,
  cancellationAssetType,
  cancellationAssetLocation,
}) => {
  const payload = {
    recipient,
    type,
    title,
    message,
    relatedRequest,
    relatedAsset,
    relatedRental,
    relatedPayment,
    isRead: false,
    isHidden: false,
  };

  if (scheduleKey) {
    payload.scheduleKey = scheduleKey;
  }

  if (audience) {
    payload.audience = audience;
  }

  if (cancellationReason) {
    payload.cancellationReason = cancellationReason;
  }
  if (cancellationOwnerName) {
    payload.cancellationOwnerName = cancellationOwnerName;
  }
  if (cancellationAssetName) {
    payload.cancellationAssetName = cancellationAssetName;
  }
  if (cancellationAssetType) {
    payload.cancellationAssetType = cancellationAssetType;
  }
  if (cancellationAssetLocation) {
    payload.cancellationAssetLocation = cancellationAssetLocation;
  }

  return Notification.create(payload);
};

const serializeNotification = (notification) => {
  const createdAt = notification.createdAt
    ? new Date(notification.createdAt)
    : null;

  return {
    id: notification._id.toString(),
    type: notification.type,
    title: notification.title,
    message: notification.message,
    relatedRequestId: notification.relatedRequest
      ? notification.relatedRequest.toString()
      : null,
    relatedAssetId: notification.relatedAsset
      ? notification.relatedAsset.toString()
      : null,
    relatedRentalId: notification.relatedRental
      ? notification.relatedRental.toString()
      : null,
    relatedPaymentId: notification.relatedPayment
      ? notification.relatedPayment.toString()
      : null,
    cancellationReason: notification.cancellationReason || '',
    cancellationOwnerName: notification.cancellationOwnerName || '',
    cancellationAssetName: notification.cancellationAssetName || '',
    cancellationAssetType: notification.cancellationAssetType || '',
    cancellationAssetLocation: notification.cancellationAssetLocation || '',
    audience: notification.audience || null,
    isRead: Boolean(notification.isRead),
    read: Boolean(notification.isRead),
    createdAt: notification.createdAt,
    time: formatRelativeTime(createdAt),
  };
};

const visibleForRecipient = (userId) => ({
  recipient: userId,
  isHidden: { $ne: true },
});

const formatRelativeTime = (date) => {
  if (!date) {
    return '';
  }

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) {
    return 'Just now';
  }

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find(
      visibleForRecipient(req.userId)
    ).sort({ createdAt: -1 });

    return res.status(200).json({
      notifications: notifications.map(serializeNotification),
    });
  } catch (error) {
    console.error('Get notifications error:', error);

    return res.status(500).json({
      message: 'Server error while fetching notifications',
    });
  }
};

const getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      ...visibleForRecipient(req.userId),
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.status(200).json({
      notification: serializeNotification(notification),
    });
  } catch (error) {
    console.error('Get notification by id error:', error);

    return res.status(500).json({
      message: 'Server error while fetching notification',
    });
  }
};

const getUnreadNotificationsCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      ...visibleForRecipient(req.userId),
      isRead: false,
    });

    return res.status(200).json({ count });
  } catch (error) {
    console.error('Get unread notifications count error:', error);

    return res.status(500).json({
      message: 'Server error while counting notifications',
    });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.userId.toString()) {
      return res.status(403).json({
        message: 'You do not have permission to update this notification',
      });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({
      message: 'Notification marked as read',
      notification: serializeNotification(notification),
    });
  } catch (error) {
    console.error('Mark notification read error:', error);

    return res.status(500).json({
      message: 'Server error while updating notification',
    });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { ...visibleForRecipient(req.userId), isRead: false },
      { $set: { isRead: true } }
    );

    return res.status(200).json({
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);

    return res.status(500).json({
      message: 'Server error while updating notifications',
    });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.userId.toString()) {
      return res.status(403).json({
        message: 'You do not have permission to delete this notification',
      });
    }

    notification.isHidden = true;
    await notification.save();

    return res.status(200).json({
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('Delete notification error:', error);

    return res.status(500).json({
      message: 'Server error while deleting notification',
    });
  }
};

const deleteNotifications = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];

    if (ids.length === 0) {
      return res.status(400).json({
        message: 'Select at least one notification to delete',
      });
    }

    const result = await Notification.updateMany(
      {
        _id: { $in: ids },
        recipient: req.userId,
        isHidden: { $ne: true },
      },
      { $set: { isHidden: true } }
    );

    return res.status(200).json({
      message: 'Notifications deleted successfully',
      deletedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Delete notifications error:', error);

    return res.status(500).json({
      message: 'Server error while deleting notifications',
    });
  }
};

module.exports = {
  createNotification,
  getMyNotifications,
  getNotificationById,
  getUnreadNotificationsCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteNotifications,
};
