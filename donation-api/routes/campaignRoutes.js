// ============================================
// FILE 15: routes/campaignRoutes.js
// ============================================
import express from 'express';
import Campaign from '../models/Campaign.js';
import { authenticate, adminOnly } from '../middleware/authMiddleware.js';
import { campaignValidator } from '../utils/validators.js';

const router = express.Router();

// Create campaign (admin only)
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { error, value } = campaignValidator.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const campaign = new Campaign({
      ...value,
      createdBy: req.user._id
    });

    await campaign.save();
    res.status(201).json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all campaigns
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const campaigns = await Campaign.find(query).sort({ createdAt: -1 });
    res.json({ success: true, campaigns });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single campaign
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).populate('createdBy', 'name email');
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    res.json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update campaign (admin only)
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    res.json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Archive campaign (admin only)
router.patch('/:id/archive', authenticate, adminOnly, async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { status: 'archived', updatedAt: new Date() },
      { new: true }
    );
    res.json({ success: true, campaign });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete campaign (admin only)
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;