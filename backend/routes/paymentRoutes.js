const express = require('express');
const {
  createPaymentSession,
  verifyPayment,
  getPaymentHistory,
  getAdminPayments,
  getAdminStats,
  settlePayment,
} = require('../controllers/paymentController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/create-session', protect, createPaymentSession);
router.post('/verify', protect, verifyPayment);
router.get('/history', protect, getPaymentHistory);
router.get('/admin/stats', protect, requireAdmin, getAdminStats);
router.get('/admin', protect, requireAdmin, getAdminPayments);
router.patch('/:id/settle', protect, requireAdmin, settlePayment);

module.exports = router;
