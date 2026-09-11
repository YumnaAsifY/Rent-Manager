const express = require('express');
const {
  getAdminUsers,
  getAdminUserById,
  setAdminUserActive,
} = require('../controllers/adminUserController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/admin', protect, requireAdmin, getAdminUsers);
router.get('/admin/:id', protect, requireAdmin, getAdminUserById);
router.patch('/admin/:id/active', protect, requireAdmin, setAdminUserActive);

module.exports = router;
