const express = require('express');
const {
  getMyRentals,
  getMyRentalsCount,
  getRentalById,
} = require('../controllers/rentalController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/mine', protect, getMyRentals);
router.get('/mine/count', protect, getMyRentalsCount);
router.get('/:id', protect, getRentalById);

module.exports = router;
