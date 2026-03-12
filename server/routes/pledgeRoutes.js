const express = require('express');
const {
  createPledge,
  getUserPledges,
  getCampaignPledges,
  getPledge,
  updatePledge,
  cancelPledge,
  getAllPledges,
  deletePledge,
  uncancelPledge,
  sendPledgeReminders   
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

// Add this route BEFORE the /:pledgeId route
router.get('/all', protect, requirePermission('view:pledges:all', 'manage:donations'), getAllPledges);


// Get single pledge (own pledge)
router.get('/:pledgeId', protect, getPledge);

// Cancel own pledge
router.patch('/:pledgeId/cancel', protect, cancelPledge);

// ============================================
// ADMIN/PRIVILEGED ROUTES - GRANULAR PERMISSIONS
// ============================================

// Get campaign pledges (requires view:pledges:all)
router.get('/campaign/:campaignId', protect, requirePermission('view:pledges:all', 'manage:donations'), getCampaignPledges);

router.post('/send-reminders', protect, requirePermission('manage:donations'), sendPledgeReminders);

// Update pledge (requires edit:pledges)
router.put('/:pledgeId', protect, requirePermission('edit:pledges', 'manage:donations'), updatePledge);

// Uncancel pledge (restore cancelled pledge) - Admin only
router.patch('/:pledgeId/uncancel', protect, requirePermission('edit:pledges', 'manage:donations'), uncancelPledge);

// Delete pledge (cancelled pledges only) - Admin only
router.delete('/:pledgeId', protect, requirePermission('delete:pledges', 'manage:donations'), deletePledge);

module.exports = router;