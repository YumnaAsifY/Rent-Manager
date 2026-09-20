const express = require('express');
const {
  registerUser,
  loginUser,
  getCurrentUser,
  updateProfile,
  updateProfileImage,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.get('/me', protect, getCurrentUser);
router.put('/profile', protect, updateProfile);
router.put(
  '/profile-image',
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
  updateProfileImage
);
router.put('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;