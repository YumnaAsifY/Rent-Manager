const express = require('express');
const {
  createRentalRequest,
  getMyRentalRequests,
  getOwnerRentalRequests,
  getMyPendingRequestsCount,
  getRentalRequestById,
  acceptRentalRequest,
  rejectRentalRequest,
  hideRentalRequest,
  hideRentalRequests,
} = require('../controllers/rentalRequestController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createRentalRequest);
router.get('/mine', protect, getMyRentalRequests);
router.get('/owner', protect, getOwnerRentalRequests);
router.get('/mine/pending-count', protect, getMyPendingRequestsCount);
router.patch('/hide-bulk', protect, hideRentalRequests);
router.patch('/:id/accept', protect, acceptRentalRequest);
router.patch('/:id/reject', protect, rejectRentalRequest);
router.patch('/:id/hide', protect, hideRentalRequest);
router.get('/:id', protect, getRentalRequestById);

module.exports = router;
