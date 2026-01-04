// ============================================
// FILE 32: controllers/campaignController.js
// (More advanced campaign management)
// ============================================
import Campaign from '../models/Campaign.js';
import Pledge from '../models/Pledge.js';
import Payment from '../models/Payment.js';
import AuditLog from '../models/AuditLog.js';

export const logCampaignAction = async (admin, action, campaignId, before, after) => {
  await AuditLog.create({
    adminId: admin._id,
    action,
    resource: 'campaign',
    resourceId: campaignId,
    changes: { before, after }
  });
};

export const getCampaignStats = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId);
  const pledges = await Pledge.find({ campaignId });
  const payments = await Payment.find({ campaignId, status: 'success' });

  return {
    campaign,
    totalPledges: pledges.length,
    totalPledged: pledges.reduce((sum, p) => sum + p.pledgedAmount, 0),
    totalRaised: campaign.totalRaised,
    successfulPayments: payments.length,
    completedPledges: pledges.filter(p => p.status === 'completed').length,
    daysRunning: Math.floor((new Date() - campaign.startDate) / (1000 * 60 * 60 * 24)),
    daysRemaining: Math.ceil((campaign.endDate - new Date()) / (1000 * 60 * 60 * 24))
  };
};