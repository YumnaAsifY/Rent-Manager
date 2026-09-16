const express = require('express');
const {
  getPublicAssetCategories,
  getAdminAssetCategories,
  createAssetCategory,
  deleteAssetCategory,
} = require('../controllers/assetCategoryController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getPublicAssetCategories);
router.get('/admin', protect, requireAdmin, getAdminAssetCategories);
router.post('/admin', protect, requireAdmin, createAssetCategory);
router.delete('/admin/:id', protect, requireAdmin, deleteAssetCategory);

module.exports = router;
