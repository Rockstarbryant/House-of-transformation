// ============================================
// FILE 16: routes/pledgeRoutes.js
// ============================================
import express from 'express';
import Pledge from '../models/Pledge.js';
import Campaign from '../models/Campaign.js';
import { authenticate, adminOnly } from '../middleware/authMiddleware.js';
import { pledgeValidator } from '../utils/validators.js';

const router = express.Router();

// Create pledge
router.post('/', authenticate, async (req, res) => {
  try {
    const { error, value } = pledgeValidator.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const campaign = await Campaign.findById(value.campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    if (campaign.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Campaign is not active' });
    }

    const pledge = new Pledge({
      ...value,
      memberId: req.user._id,
      memberName: req.user.name,
      memberEmail: req.user.email || value.memberEmail,
      dueDate: campaign.endDate,
      nextPaymentDue: new Date()
    });

    await pledge.save();

    // Update campaign totals
    campaign.totalPledged += value.pledgedAmount;
    await campaign.save();

    res.status(201).json({ success: true, pledge });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get member's pledges
router.get('/member/my-pledges', authenticate, async (req, res) => {
  try {
    const pledges = await Pledge.find({ memberId: req.user._id })
      .populate('campaignId', 'name type endDate status goalAmount totalRaised');
    res.json({ success: true, pledges });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all pledges (admin only)
router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { campaignId, status } = req.query;
    const query = {};
    if (campaignId) query.campaignId = campaignId;
    if (status) query.status = status;

    const pledges = await Pledge.find(query)
      .populate('memberId', 'name email')
      .populate('campaignId', 'name');
    res.json({ success: true, pledges });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single pledge
router.get('/:id', authenticate, async (req, res) => {
  try {
    const pledge = await Pledge.findById(req.params.id)
      .populate('campaignId')
      .populate('memberId', 'name email');

    if (!pledge) {
      return res.status(404).json({ success: false, error: 'Pledge not found' });
    }

    // Check authorization
    if (pledge.memberId._id.toString() !== req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    res.json({ success: true, pledge });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update pledge (admin only)
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const pledge = await Pledge.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ success: true, pledge });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;