const express = require('express');
const {
  createReport,
  getAdminReports,
  reviewAdminReport,
} = require('../controllers/reportController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createReport);
router.get('/admin', protect, requireAdmin, getAdminReports);
router.patch('/admin/:id', protect, requireAdmin, reviewAdminReport);

module.exports = router;
