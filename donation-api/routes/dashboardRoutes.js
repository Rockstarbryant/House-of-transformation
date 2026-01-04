// ============================================
// FILE 18: routes/dashboardRoutes.js
// ============================================
import express from 'express';
import Pledge from '../models/Pledge.js';
import Payment from '../models/Payment.js';
import Campaign from '../models/Campaign.js';
import { authenticate, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Member dashboard
router.get('/member', authenticate, async (req, res) => {
  try {
    const pledges = await Pledge.find({ memberId: req.user._id })
      .populate('campaignId');

    const totalPledged = pledges.reduce((sum, p) => sum + p.pledgedAmount, 0);
    const totalPaid = pledges.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalRemaining = pledges.reduce((sum, p) => sum + p.remainingAmount, 0);

    const activeCampaigns = await Campaign.find({ status: 'active' });

    res.json({
      success: true,
      stats: {
        totalPledged,
        totalPaid,
        totalRemaining,
        activeCampaigns: activeCampaigns.length,
        completedPledges: pledges.filter(p => p.status === 'completed').length,
        pendingPledges: pledges.filter(p => p.status !== 'completed').length
      },
      pledges,
      activeCampaigns
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin dashboard
router.get('/admin', authenticate, adminOnly, async (req, res) => {
  try {
    const totalCampaigns = await Campaign.countDocuments();
    const activeCampaigns = await Campaign.countDocuments({ status: 'active' });
    
    const campaigns = await Campaign.find();
    const totalGoal = campaigns.reduce((sum, c) => sum + c.goalAmount, 0);
    const totalRaised = campaigns.reduce((sum, c) => sum + c.totalRaised, 0);

    const pledges = await Pledge.countDocuments();
    const payments = await Payment.find({ status: 'success' });
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

    const recentPayments = await Payment.find({ status: 'success' })
      .populate('memberId', 'name email')
      .populate('campaignId', 'name')
      .sort({ completedAt: -1 })
      .limit(10);

    res.json({
      success: true,
      stats: {
        totalCampaigns,
        activeCampaigns,
        totalGoal,
        totalRaised,
        totalPledges: pledges,
        successfulPayments: payments.length,
        totalPayments
      },
      recentPayments
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Campaign analytics
router.get('/campaign/:campaignId', authenticate, adminOnly, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.campaignId);
    const pledges = await Pledge.find({ campaignId: req.params.campaignId });
    const payments = await Payment.find({ 
      campaignId: req.params.campaignId,
      status: 'success'
    });

    const totalPledged = pledges.reduce((sum, p) => sum + p.pledgedAmount, 0);
    const totalRaised = payments.reduce((sum, p) => sum + p.amount, 0);
    const percentageRaised = (totalRaised / campaign.goalAmount) * 100;

    res.json({
      success: true,
      campaign,
      analytics: {
        totalPledges: pledges.length,
        totalPledged,
        totalRaised,
        percentageRaised: Math.round(percentageRaised),
        successfulPayments: payments.length,
        completedPledges: pledges.filter(p => p.status === 'completed').length,
        pendingPledges: pledges.filter(p => p.status === 'pending').length
      },
      pledges,
      payments
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;