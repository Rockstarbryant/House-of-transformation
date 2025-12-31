const express = require('express');
const {
  getOpportunities,
  apply,
  getProfile,
  updateStatus,
  getAllApplications
} = require('../controllers/volunteerController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/opportunities', getOpportunities);
router.post('/apply', protect, apply);
router.get('/profile', protect, getProfile);
router.get('/applications', protect, authorize('admin'), getAllApplications);
router.put('/:id', protect, authorize('admin'), updateStatus);

module.exports = router;