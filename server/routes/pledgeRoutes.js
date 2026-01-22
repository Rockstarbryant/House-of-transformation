const express = require('express');
const {
  createPledge,
  getUserPledges,
  getCampaignPledges,
  getPledge,
  updatePledge,
  cancelPledge
} = require('../controllers/pledgeController');

const { protect } = require('../middleware/supabaseAuth');
const { requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

// ============================================
// USER ROUTES
// ============================================

// Create pledge (authenticated users)
router.post('/', protect, createPledge);

// Get user's own pledges
router.get('/my-pledges', protect, getUserPledges);

// Get single pledge (own pledge)
router.get('/:pledgeId', protect, getPledge);

// Cancel own pledge
router.patch('/:pledgeId/cancel', protect, cancelPledge);

// ============================================
// ADMIN/PRIVILEGED ROUTES - GRANULAR PERMISSIONS
// ============================================

// Get campaign pledges (requires view:pledges:all)
router.get('/campaign/:campaignId', protect, requirePermission('view:pledges:all', 'manage:donations'), getCampaignPledges);

// Update pledge (requires edit:pledges)
router.put('/:pledgeId', protect, requirePermission('edit:pledges', 'manage:donations'), updatePledge);

module.exports = router;