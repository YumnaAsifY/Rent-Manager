const express = require('express');
const {
  getMyRentals,
  getMyRentalsCount,
  getRentalById,
  hideExpiredRentals,
} = require('../controllers/rentalController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/mine', protect, getMyRentals);
router.get('/mine/count', protect, getMyRentalsCount);
router.patch('/hide-bulk', protect, hideExpiredRentals);
router.get('/:id', protect, getRentalById);

module.exports = router;
