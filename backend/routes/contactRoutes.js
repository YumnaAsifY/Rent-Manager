const express = require('express');
const { getContactInfo, submitContact } = require('../controllers/contactController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getContactInfo);
router.post('/', protect, submitContact);

module.exports = router;
