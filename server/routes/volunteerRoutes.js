const express = require('express');
const { protect } = require('../middleware/supabaseAuth');
const { requirePermission, requireAdmin } = require('../middleware/requirePermission');
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

const router = express.Router();

// ===== PUBLIC ROUTES (NO AUTH) =====
router.get('/opportunities', getOpportunities);

// ===== PROTECTED ROUTES (AUTH REQUIRED) =====
router.get('/check-application', protect, checkExistingApplication);
router.post('/apply', protect, apply);
router.put('/:id/edit', protect, editApplication);
router.get('/profile', protect, getProfile);
router.get('/my-applications', protect, getMyApplications);

// ===== PROTECTED ROUTES (AUTH + manage:volunteers PERMISSION REQUIRED) =====
router.get('/applications', protect, requirePermission('manage:volunteers'), getAllApplications);
router.get('/stats', protect, requirePermission('manage:volunteers'), getStats);
router.put('/:id', protect, requirePermission('manage:volunteers'), updateStatus);
router.put('/:id/hours', protect, requirePermission('manage:volunteers'), updateHours);

// ===== ADMIN ONLY ROUTE =====
router.delete('/:id', protect, requireAdmin, deleteApplication);

module.exports = router;