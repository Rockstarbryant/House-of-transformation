const express = require('express');
const {
  createCampaign,
  getAllCampaigns,
  getCampaign,
  updateCampaign,
  activateCampaign,
  completeCampaign,
  getCampaignAnalytics,
  archiveCampaign,
  deleteCampaign,
  updateOverdueCampaigns,
  getFeaturedCampaigns
} = require('../controllers/campaignController');

const { protect } = require('../middleware/supabaseAuth');
const { optionalAuth } = require('../middleware/supabaseAuth');
const { requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================
router.get('/', optionalAuth, getAllCampaigns);
router.get('/featured', getFeaturedCampaigns);
router.get('/:id', optionalAuth, getCampaign);

// ============================================
// PROTECTED ROUTES - GRANULAR PERMISSIONS
// ============================================

// Create campaign
router.post('/', protect, requirePermission('create:campaigns', 'manage:donations'), createCampaign);

// Update campaign
router.put('/:id', protect, requirePermission('edit:campaigns', 'manage:donations'), updateCampaign);

// Activate campaign
router.patch('/:id/activate', protect, requirePermission('activate:campaigns', 'manage:donations'), activateCampaign);

router.post('/check-overdue', protect, requirePermission('manage:donations'), updateOverdueCampaigns);

// Add this route with other protected routes
router.get('/:id/analytics', protect, requirePermission('view:campaigns', 'manage:donations'), getCampaignAnalytics);

// Complete campaign
router.patch('/:id/complete', protect, requirePermission('edit:campaigns', 'manage:donations'), completeCampaign);

// Archive campaign
router.patch('/:id/archive', protect, requirePermission('edit:campaigns', 'manage:donations'), archiveCampaign);

// Delete campaign
router.delete('/:id', protect, requirePermission('delete:campaigns', 'manage:donations'), deleteCampaign);

module.exports = router;