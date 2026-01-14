const express = require('express');
const {
  getOpportunities,
  checkExistingApplication,
  apply,
  editApplication,
  getProfile,
  getMyApplications,
  getAllApplications,
  updateStatus,
  updateHours,
  deleteApplication,
  getStats
} = require('../controllers/volunteerController');
const { protect, authorize } = require('../middleware/supabaseAuth');

const router = express.Router();

// ===== PUBLIC ROUTES (NO AUTH) =====
router.get('/opportunities', getOpportunities);

// ===== PROTECTED ROUTES (AUTH REQUIRED) =====
router.get('/check-application', protect, checkExistingApplication);
router.post('/apply', protect, apply);
router.put('/:id/edit', protect, editApplication);
router.get('/profile', protect, getProfile);
router.get('/my-applications', protect, getMyApplications);

// ===== ADMIN ONLY ROUTES =====
router.get('/applications', protect, authorize('admin'), getAllApplications);
router.get('/stats', protect, authorize('admin'), getStats);
router.put('/:id', protect, authorize('admin'), updateStatus);
router.put('/:id/hours', protect, authorize('admin'), updateHours);
router.delete('/:id', protect, authorize('admin'), deleteApplication);

module.exports = router;