const express = require('express');
const {
  getMyAssets,
  getMyAssetsCount,
  getAssetById,
  createAsset,
  updateAsset,
  assignAssetToTenant,
  makeAssetAvailable,
  removeTenantFromAsset,
  deleteAsset,
  exploreAssets,
  getExploreAssetById,
} = require('../controllers/assetController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/mine', protect, getMyAssets);
router.get('/mine/count', protect, getMyAssetsCount);
router.get('/explore', protect, exploreAssets);
router.get('/explore/:id', protect, getExploreAssetById);
router.post(
  '/',
  protect,
  (req, res, next) => {
    upload.single('image')(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          message: error.message || 'Image upload failed',
        });
      }

      return next();
    });
  },
  createAsset
);
router.put(
  '/:id',
  protect,
  (req, res, next) => {
    upload.single('image')(req, res, (error) => {
      if (error) {
        return res.status(400).json({
          message: error.message || 'Image upload failed',
        });
      }

      return next();
    });
  },
  updateAsset
);
router.get('/:id', protect, getAssetById);
router.post('/:id/assign', protect, assignAssetToTenant);
router.post('/:id/remove-tenant', protect, removeTenantFromAsset);
router.patch('/:id/make-available', protect, makeAssetAvailable);
router.delete('/:id', protect, deleteAsset);

module.exports = router;
