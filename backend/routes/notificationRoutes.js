const express = require('express');
const {
  getMyNotifications,
  getUnreadNotificationsCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteNotifications,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getMyNotifications);
router.get('/unread-count', protect, getUnreadNotificationsCount);
router.patch('/read-all', protect, markAllNotificationsRead);
router.delete('/bulk', protect, deleteNotifications);
router.patch('/:id/read', protect, markNotificationRead);
router.delete('/:id', protect, deleteNotification);

module.exports = router;
