// server/controllers/pledgeController.js

const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');
const asyncHandler = require('../middleware/asyncHandler');
const Campaign = require('../models/Campaign');

// Initialize Supabase client
const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY
);

// ============================================
// CREATE PLEDGE - FIXED
// ============================================
exports.createPledge = asyncHandler(async (req, res) => {
  try {
    const { campaignId, pledgedAmount, installmentPlan, notes } = req.body;

    console.log('[PLEDGE-CREATE] Creating pledge for user:', req.user._id);

    // Validate required fields
    if (!campaignId || !pledgedAmount) {
      return res.status(400).json({
        success: false,
        message: 'Campaign ID and pledged amount are required'
      });
    }

    if (pledgedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Pledged amount must be greater than 0'
      });
    }

    // Check if campaign exists (MongoDB)
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    if (campaign.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Campaign is not active'
      });
    }

    if (!campaign.allowPledges) {
      return res.status(400).json({
        success: false,
        message: 'This campaign does not allow pledges'
      });
    }

    // ✅ Check if campaign has Supabase ID
    if (!campaign.supabaseId) {
      return res.status(400).json({
        success: false,
        message: 'Campaign not synced to Supabase'
      });
    }

    // ✅ FIX: DO NOT send remaining_amount - it's a GENERATED column
    const { data, error } = await supabase
      .from('pledges')
      .insert([{
        campaign_id: campaign.supabaseId,
        user_id: req.user._id,
        member_name: req.user.name,
        member_phone: req.user.phone || '',
        member_email: req.user.email,
        pledged_amount: pledgedAmount,
        paid_amount: 0,
        // ✅ REMOVED: remaining_amount - Supabase calculates this automatically
        status: 'pending',
        installment_plan: installmentPlan || 'lump-sum',
        due_date: campaign.endDate,
        next_payment_due: new Date(),
        notes: notes || null
      }])
      .select()
      .single();

    if (error) {
      console.error('[PLEDGE-CREATE] Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create pledge',
        error: error.message
      });
    }

    console.log('[PLEDGE-CREATE] Pledge created:', data.id);

    res.status(201).json({
      success: true,
      message: 'Pledge created successfully',
      pledge: data
    });

  } catch (error) {
    console.error('[PLEDGE-CREATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create pledge',
      error: error.message
    });
  }
});

// ============================================
// GET USER'S PLEDGES - ✅ WITH CAMPAIGN ENRICHMENT
// ============================================
exports.getUserPledges = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    console.log('[PLEDGE-GET-USER] Fetching pledges for user:', req.user._id);

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    // Get total count
    const { count, error: countError } = await supabase
      .from('pledges')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user._id);

    if (countError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch pledges',
        error: countError.message
      });
    }

    // Get paginated pledges
    const { data: pledges, error } = await supabase
      .from('pledges')
      .select('*')
      .eq('user_id', req.user._id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      console.error('[PLEDGE-GET-USER] Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch pledges',
        error: error.message
      });
    }

    // ✅ ENRICH WITH CAMPAIGN DATA
    const campaignIds = [...new Set(pledges.map(p => p.campaign_id).filter(Boolean))];

    console.log('[PLEDGE-GET-USER] Enriching with campaign data for', campaignIds.length, 'campaigns');

    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, title, campaign_type, status, goal_amount, current_amount')
      .in('id', campaignIds);

    if (campaignError) {
      console.error('[PLEDGE-GET-USER] Campaign fetch error:', campaignError);
    }

    // Create lookup map
    const campaignMap = {};
    if (campaigns) {
      campaigns.forEach(campaign => {
        campaignMap[campaign.id] = campaign;
      });
    }

    // Enrich pledges
    const enrichedPledges = pledges.map(pledge => {
      const campaign = campaignMap[pledge.campaign_id];
      
      return {
        ...pledge,
        campaign_title: campaign?.title || 'Unknown Campaign',
        campaign_type: campaign?.campaign_type || null,
        campaign_status: campaign?.status || null,
        campaign_goal: campaign?.goal_amount || 0,
        campaign_current: campaign?.current_amount || 0
      };
    });

    const pages = Math.ceil(count / limitNum);

    res.json({
      success: true,
      pledges: enrichedPledges, // ✅ Send enriched data
      pagination: {
        total: count,
        pages,
        currentPage: pageNum,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('[PLEDGE-GET-USER] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pledges',
      error: error.message
    });
  }
});

// ============================================
// GET CAMPAIGN PLEDGES - ✅ WITH CAMPAIGN ENRICHMENT
// ============================================
exports.getCampaignPledges = asyncHandler(async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    console.log('[PLEDGE-GET-CAMPAIGN] Fetching pledges for campaign:', campaignId);

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    // Build query
    let query = supabase
      .from('pledges')
      .select('*', { count: 'exact' })
      .eq('campaign_id', campaignId);

    // Add status filter if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Get total count
    const { count, error: countError } = await query;
    if (countError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch pledges',
        error: countError.message
      });
    }

    // Get paginated data
    const { data: pledges, error } = await supabase
      .from('pledges')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      console.error('[PLEDGE-GET-CAMPAIGN] Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch pledges',
        error: error.message
      });
    }

    // ✅ ENRICH WITH CAMPAIGN DATA
    // Since we already know the campaignId, just fetch that one campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, title, campaign_type, status, goal_amount, current_amount')
      .eq('id', campaignId)
      .single();

    if (campaignError) {
      console.error('[PLEDGE-GET-CAMPAIGN] Campaign fetch error:', campaignError);
    }

    // Enrich all pledges with the same campaign data
    const enrichedPledges = pledges.map(pledge => ({
      ...pledge,
      campaign_title: campaign?.title || 'Unknown Campaign',
      campaign_type: campaign?.campaign_type || null,
      campaign_status: campaign?.status || null,
      campaign_goal: campaign?.goal_amount || 0,
      campaign_current: campaign?.current_amount || 0
    }));

    const pages = Math.ceil(count / limitNum);

    res.json({
      success: true,
      pledges: enrichedPledges, // ✅ Send enriched data
      pagination: {
        total: count,
        pages,
        currentPage: pageNum,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('[PLEDGE-GET-CAMPAIGN] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign pledges',
      error: error.message
    });
  }
});

// ============================================
// GET SINGLE PLEDGE
// ============================================
exports.getPledge = asyncHandler(async (req, res) => {
  try {
    const { pledgeId } = req.params;

    console.log('[PLEDGE-GET] Fetching pledge:', pledgeId);

    const { data, error } = await supabase
      .from('pledges')
      .select('*')
      .eq('id', pledgeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Pledge not found'
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch pledge',
        error: error.message
      });
    }

    // Check authorization - user can view own, admin can view all
    if (data.user_id !== req.user._id && req.user.role?.name !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this pledge'
      });
    }

    res.json({
      success: true,
      pledge: data
    });

  } catch (error) {
    console.error('[PLEDGE-GET] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pledge',
      error: error.message
    });
  }
});

// ============================================
// GET ALL PLEDGES - ✅ WITH CAMPAIGN ENRICHMENT
// ============================================
exports.getAllPledges = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    console.log('[PLEDGE-GET-ALL] Fetching all pledges with campaign data');

    // Get total count
    const { count } = await supabase
      .from('pledges')
      .select('*', { count: 'exact', head: true });

    // Get paginated pledges
    const { data: pledges, error } = await supabase
      .from('pledges')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      console.error('[PLEDGE-GET-ALL] Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch pledges',
        error: error.message
      });
    }

    // ✅ ENRICH WITH CAMPAIGN DATA
    // Get unique campaign IDs from pledges
    const campaignIds = [...new Set(pledges.map(p => p.campaign_id).filter(Boolean))];

    console.log('[PLEDGE-GET-ALL] Enriching with campaign data for', campaignIds.length, 'campaigns');

    // Fetch all campaigns in one query
    const { data: campaigns, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, title, campaign_type, status, goal_amount, current_amount')
      .in('id', campaignIds);

    if (campaignError) {
      console.error('[PLEDGE-GET-ALL] Campaign fetch error:', campaignError);
      // Don't fail the request, just log and continue without enrichment
    }

    // Create campaign lookup map: { [uuid]: campaign }
    const campaignMap = {};
    if (campaigns) {
      campaigns.forEach(campaign => {
        campaignMap[campaign.id] = campaign;
      });
    }

    // ✅ ENRICH PLEDGES WITH CAMPAIGN INFO
    const enrichedPledges = pledges.map(pledge => {
      const campaign = campaignMap[pledge.campaign_id];
      
      return {
        ...pledge,
        // Add campaign fields
        campaign_title: campaign?.title || 'Unknown Campaign',
        campaign_type: campaign?.campaign_type || null,
        campaign_status: campaign?.status || null,
        campaign_goal: campaign?.goal_amount || 0,
        campaign_current: campaign?.current_amount || 0
      };
    });

    console.log('[PLEDGE-GET-ALL] Successfully enriched', enrichedPledges.length, 'pledges');

    res.json({
      success: true,
      pledges: enrichedPledges, // ✅ Send enriched data
      pagination: {
        total: count,
        pages: Math.ceil(count / limitNum),
        currentPage: pageNum,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('[PLEDGE-GET-ALL] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pledges',
      error: error.message
    });
  }
});

// ============================================
// UPDATE PLEDGE (Admin only)
// ============================================
exports.updatePledge = asyncHandler(async (req, res) => {
  try {
    const { pledgeId } = req.params;
    const updates = req.body;

    console.log('[PLEDGE-UPDATE] Updating pledge:', pledgeId);

    // ✅ EXPANDED: Allow more fields to be updated
    const allowedUpdates = [
      'pledged_amount',      // ✅ NEW: Allow amount changes
      'installment_plan', 
      'notes', 
      'due_date',
      'next_payment_due'     // ✅ NEW: Allow updating next payment date
    ];
    
    const updateData = {};

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    // ✅ NEW: Validation for pledged_amount
    if (updateData.pledged_amount !== undefined) {
      if (updateData.pledged_amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Pledged amount must be greater than 0'
        });
      }

      // Get current pledge to check paid amount
      const { data: currentPledge } = await supabase
        .from('pledges')
        .select('paid_amount')
        .eq('id', pledgeId)
        .single();

      if (currentPledge && updateData.pledged_amount < currentPledge.paid_amount) {
        return res.status(400).json({
          success: false,
          message: `New pledged amount (${updateData.pledged_amount}) cannot be less than amount already paid (${currentPledge.paid_amount})`
        });
      }
    }

    // Update in Supabase
    const { data, error } = await supabase
      .from('pledges')
      .update(updateData)
      .eq('id', pledgeId)
      .select()
      .single();

    if (error) {
      console.error('[PLEDGE-UPDATE] Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update pledge',
        error: error.message
      });
    }

    console.log('[PLEDGE-UPDATE] Pledge updated:', pledgeId);

    res.json({
      success: true,
      message: 'Pledge updated successfully',
      pledge: data
    });

  } catch (error) {
    console.error('[PLEDGE-UPDATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update pledge',
      error: error.message
    });
  }
});

// ============================================
// CANCEL PLEDGE (User/Admin)
// ============================================
exports.cancelPledge = asyncHandler(async (req, res) => {
  try {
    const { pledgeId } = req.params;

    console.log('[PLEDGE-CANCEL] Cancelling pledge:', pledgeId);

    // Get pledge to check authorization
    const { data: pledge, error: fetchError } = await supabase
      .from('pledges')
      .select('*')
      .eq('id', pledgeId)
      .single();

    if (fetchError) {
      return res.status(404).json({
        success: false,
        message: 'Pledge not found'
      });
    }

    // Check authorization
    if (pledge.user_id !== req.user._id && req.user.role?.name !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to cancel this pledge'
      });
    }

    // Can't cancel completed pledges
    if (pledge.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed pledge'
      });
    }

    // Update status to cancelled
    const { data, error } = await supabase
      .from('pledges')
      .update({ status: 'cancelled' })
      .eq('id', pledgeId)
      .select()
      .single();

    if (error) {
      console.error('[PLEDGE-CANCEL] Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to cancel pledge',
        error: error.message
      });
    }

    console.log('[PLEDGE-CANCEL] Pledge cancelled:', pledgeId);

    res.json({
      success: true,
      message: 'Pledge cancelled successfully',
      pledge: data
    });

  } catch (error) {
    console.error('[PLEDGE-CANCEL] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel pledge',
      error: error.message
    });
  }
});