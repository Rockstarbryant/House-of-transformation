// server/controllers/donationAnalyticsController.js
const Campaign = require('../models/Campaign');
const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');
const asyncHandler = require('../middleware/asyncHandler');

const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY
);

// ============================================
// DASHBOARD ANALYTICS
// ============================================

exports.getDashboardAnalytics = asyncHandler(async (req, res) => {
  try {
    console.log('[ANALYTICS] Fetching dashboard data');

    // 1. GET ALL CAMPAIGNS (MongoDB)
    const campaigns = await Campaign.find({ status: { $in: ['active', 'completed'] } });

    if (!campaigns || campaigns.length === 0) {
      return res.json({
        success: true,
        data: {
          campaigns: [],
          monthlyTrend: [],
          paymentMethodBreakdown: [],
          pledgeStatusBreakdown: [],
          memberGivingTiers: [],
          kpis: {
            totalRaised: 0,
            totalGoal: 0,
            totalPledges: 0,
            totalPaid: 0,
            totalRemaining: 0,
            collectionRate: 0,
            goalCompletion: 0
          }
        }
      });
    }

    // 2. GET ALL PLEDGES (Supabase)
    const { data: pledges, error: pledgesError } = await supabase
      .from('pledges')
      .select('*');

    if (pledgesError) {
      console.error('[ANALYTICS] Pledges error:', pledgesError);
      pledges = [];
    }

    // 3. GET ALL PAYMENTS (Supabase)
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*');

    if (paymentsError) {
      console.error('[ANALYTICS] Payments error:', paymentsError);
      payments = [];
    }

    // 4. TRANSFORM CAMPAIGNS DATA
    const campaignsData = campaigns.map(campaign => {
      const campaignPledges = pledges.filter(p => p.campaign_id === campaign.supabaseId) || [];
      const campaignPayments = payments.filter(p => p.campaign_id === campaign.supabaseId) || [];
      
      return {
        id: campaign._id,
        name: campaign.title,
        goal: campaign.goalAmount,
        raised: campaign.currentAmount,
        pledges: campaignPledges.length,
        paid: campaignPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      };
    });

    // 5. CALCULATE MONTHLY TREND
    const monthlyTrend = calculateMonthlyTrend(payments, pledges);

    // 6. PAYMENT METHOD BREAKDOWN
    const paymentMethodBreakdown = calculatePaymentMethods(payments);

    // 7. PLEDGE STATUS BREAKDOWN
    const pledgeStatusBreakdown = calculatePledgeStatus(pledges);

    // 8. MEMBER GIVING TIERS
    const memberGivingTiers = calculateMemberTiers(pledges);

    // 9. CALCULATE KPIs
    const kpis = calculateKPIs(campaignsData, pledges, payments);

    console.log('[ANALYTICS] Data compiled successfully');

    res.json({
      success: true,
      data: {
        campaigns: campaignsData,
        monthlyTrend,
        paymentMethodBreakdown,
        pledgeStatusBreakdown,
        memberGivingTiers,
        kpis
      }
    });

  } catch (error) {
    console.error('[ANALYTICS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data',
      error: error.message
    });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate monthly trend for last 6 months
 */
function calculateMonthlyTrend(payments, pledges) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const today = new Date();
  const trend = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    // Sum pledges created in this month
    const monthPledges = pledges.filter(p => {
      const createdDate = new Date(p.created_at);
      return createdDate >= monthStart && createdDate <= monthEnd;
    });
    const pledgesTotal = monthPledges.reduce((sum, p) => sum + (p.pledged_amount || 0), 0);

    // Sum payments completed in this month
    const monthPayments = payments.filter(p => {
      if (p.status !== 'success') return false;
      const completedDate = new Date(p.completed_at || p.created_at);
      return completedDate >= monthStart && completedDate <= monthEnd;
    });
    const paymentsTotal = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Calculate target (average of historical or 500k default)
    const target = i < 2 ? 800000 : 600000;

    trend.push({
      month: months[5 - i],
      pledges: pledgesTotal,
      payments: paymentsTotal,
      target: target
    });
  }

  return trend;
}

/**
 * Payment method breakdown
 */
function calculatePaymentMethods(payments) {
  const methods = {
    'mpesa': { name: 'M-Pesa', value: 0 },
    'bank-transfer': { name: 'Bank Transfer', value: 0 },
    'cash': { name: 'Cash', value: 0 },
    'manual': { name: 'Manual Entry', value: 0 }
  };

  payments
    .filter(p => p.status === 'success')
    .forEach(payment => {
      const method = payment.payment_method || 'manual';
      if (methods[method]) {
        methods[method].value += payment.amount || 0;
      }
    });

  const total = Object.values(methods).reduce((sum, m) => sum + m.value, 0);

  return Object.values(methods)
    .filter(m => m.value > 0)
    .map(m => ({
      name: m.name,
      value: m.value,
      percentage: total > 0 ? Math.round((m.value / total) * 100) : 0
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Pledge status distribution
 */
function calculatePledgeStatus(pledges) {
  const statuses = {
    completed: 0,
    partial: 0,
    pending: 0,
    cancelled: 0,
    overdue: 0
  };

  pledges.forEach(pledge => {
    const status = pledge.status || 'pending';
    if (statuses.hasOwnProperty(status)) {
      statuses[status]++;
    }
  });

  const total = Object.values(statuses).reduce((a, b) => a + b, 0);

  const mapping = {
    'completed': { label: 'Completed', color: 'bg-green-100' },
    'partial': { label: 'Partial', color: 'bg-blue-100' },
    'pending': { label: 'Pending', color: 'bg-yellow-100' },
    'cancelled': { label: 'Cancelled', color: 'bg-red-100' },
    'overdue': { label: 'Overdue', color: 'bg-orange-100' }
  };

  return Object.entries(statuses).map(([key, value]) => ({
    name: mapping[key]?.label || key,
    value: value,
    percentage: total > 0 ? Math.round((value / total) * 100) : 0
  }));
}

/**
 * Member giving tiers
 */
function calculateMemberTiers(pledges) {
  const tiers = {
    major: { min: 500000, max: 5000000, label: 'Major Givers', members: [], total: 0 },
    core: { min: 100000, max: 499999, label: 'Core Supporters', members: [], total: 0 },
    regular: { min: 10000, max: 99999, label: 'Regular Givers', members: [], total: 0 },
    occasional: { min: 1000, max: 9999, label: 'Occasional Givers', members: [], total: 0 }
  };

  const memberTotals = {};

  // Group pledges by user
  pledges.forEach(pledge => {
    const userId = pledge.user_id;
    if (!memberTotals[userId]) {
      memberTotals[userId] = 0;
    }
    memberTotals[userId] += pledge.pledged_amount || 0;
  });

  // Assign members to tiers
  Object.entries(memberTotals).forEach(([userId, total]) => {
    for (const [key, tier] of Object.entries(tiers)) {
      if (total >= tier.min && total <= tier.max) {
        tier.members.push(userId);
        tier.total += total;
        break;
      }
    }
  });

  return Object.entries(tiers).map(([key, tier]) => ({
    tier: tier.label,
    min: tier.min,
    max: tier.max,
    count: tier.members.length,
    total: tier.total
  }));
}

/**
 * Calculate KPIs
 */
function calculateKPIs(campaigns, pledges, payments) {
  const totalRaised = campaigns.reduce((sum, c) => sum + c.raised, 0);
  const totalGoal = campaigns.reduce((sum, c) => sum + c.goal, 0);
  const totalPledges = pledges.length;
  const totalPaid = payments
    .filter(p => p.status === 'success')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalRemaining = totalRaised - totalPaid;
  const collectionRate = totalRaised > 0 ? ((totalPaid / totalRaised) * 100).toFixed(1) : 0;
  const goalCompletion = totalGoal > 0 ? ((totalRaised / totalGoal) * 100).toFixed(1) : 0;
  const averagePledge = totalPledges > 0 ? (totalRaised / totalPledges).toFixed(0) : 0;

  return {
    totalRaised,
    totalGoal,
    totalPledges,
    totalPaid,
    totalRemaining,
    collectionRate: parseFloat(collectionRate),
    goalCompletion: parseFloat(goalCompletion),
    averagePledge: parseInt(averagePledge)
  };
}

// ============================================
// DETAILED CAMPAIGN ANALYTICS
// ============================================

exports.getCampaignAnalytics = asyncHandler(async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Get campaign-specific data
    const { data: pledges } = await supabase
      .from('pledges')
      .select('*')
      .eq('campaign_id', campaign.supabaseId);

    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('campaign_id', campaign.supabaseId);

    const totalPledges = pledges?.length || 0;
    const totalPledgedAmount = pledges?.reduce((sum, p) => sum + (p.pledged_amount || 0), 0) || 0;
    const totalPaidAmount = payments?.filter(p => p.status === 'success').reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const completedPledges = pledges?.filter(p => p.status === 'completed').length || 0;
    const partialPledges = pledges?.filter(p => p.status === 'partial').length || 0;
    const pendingPledges = pledges?.filter(p => p.status === 'pending').length || 0;

    res.json({
      success: true,
      analytics: {
        campaign: {
          id: campaign._id,
          title: campaign.title,
          goal: campaign.goalAmount,
          raised: campaign.currentAmount,
          status: campaign.status
        },
        pledges: {
          total: totalPledges,
          totalAmount: totalPledgedAmount,
          completed: completedPledges,
          partial: partialPledges,
          pending: pendingPledges
        },
        payments: {
          total: payments?.length || 0,
          successful: payments?.filter(p => p.status === 'success').length || 0,
          pending: payments?.filter(p => p.status === 'pending').length || 0,
          totalAmount: totalPaidAmount
        }
      }
    });

  } catch (error) {
    console.error('[CAMPAIGN-ANALYTICS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign analytics'
    });
  }
});