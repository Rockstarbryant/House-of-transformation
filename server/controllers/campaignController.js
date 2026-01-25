// server/controllers/campaignController.js
const Campaign = require('../models/Campaign');
const asyncHandler = require('../middleware/asyncHandler');
const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

// Initialize Supabase client
const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY
);

// ============================================
// CREATE CAMPAIGN (Admin only)
// ============================================
exports.createCampaign = asyncHandler(async (req, res) => {
  try {
    const { title, description, goalAmount, campaignType, startDate, endDate, visibility, allowPledges, imageUrl, impactStatement } = req.body;

    console.log('[CAMPAIGN-CREATE] Creating campaign:', title);

    // Validate required fields
    if (!title || !description || !goalAmount || !campaignType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: title, description, goalAmount, campaignType, startDate, endDate'
      });
    }

    // Validate dates
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be before end date'
      });
    }

    // Auto-determine status based on dates
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    let initialStatus = 'draft';
    if (start <= now && end > now) {
      initialStatus = 'active';
    } else if (end <= now) {
      initialStatus = 'completed';
    }

    // Create in MongoDB first
    const campaign = await Campaign.create({
      title,
      description,
      goalAmount,
      campaignType,
      startDate,
      endDate,
      visibility: visibility || 'public',
      allowPledges: allowPledges !== undefined ? allowPledges : true,
      imageUrl: imageUrl || null,
      impactStatement: impactStatement || null,
      createdBy: req.user._id,
      status: initialStatus
    });

    // ✅ CREATE IN SUPABASE AND GET UUID
    const { data: supabaseCampaign, error: supabaseError } = await supabase
      .from('campaigns')
      .insert([{
        mongodb_id: campaign._id.toString(),
        title,
        description,
        goal_amount: goalAmount,
        current_amount: 0,
        campaign_type: campaignType,
        start_date: startDate,
        end_date: endDate,
        status: initialStatus,
        visibility: visibility || 'public',
        allow_pledges: allowPledges !== undefined ? allowPledges : true,
        image_url: imageUrl || null,
        created_by_id: req.user._id.toString()
      }])
      .select('id')
      .single();

    if (supabaseError) {
      console.error('[CAMPAIGN-CREATE] Supabase error:', supabaseError);
      // Rollback MongoDB if Supabase fails
      await Campaign.findByIdAndDelete(campaign._id);
      return res.status(500).json({
        success: false,
        message: 'Failed to sync campaign to Supabase',
        error: supabaseError.message
      });
    }

    // ✅ SAVE SUPABASE UUID TO MONGODB
    campaign.supabaseId = supabaseCampaign.id;
    await campaign.save();

    console.log('[CAMPAIGN-CREATE] Campaign created:', campaign._id, 'Supabase ID:', supabaseCampaign.id);

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      campaign
    });

  } catch (error) {
    console.error('[CAMPAIGN-CREATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create campaign',
      error: error.message
    });
  }
});

// ============================================
// GET ALL CAMPAIGNS (Public/Filtered)
// ============================================
exports.getAllCampaigns = asyncHandler(async (req, res) => {
  try {
    const { status, type, isFeatured, visibility } = req.query;
    const { page = 1, limit = 10 } = req.query;

    console.log('[CAMPAIGN-GET-ALL] Fetching campaigns');

    const query = {};

    // Apply filters
    if (status) query.status = status;
    if (type) query.campaignType = type;
    if (isFeatured === 'true') query.isFeatured = true;
    if (visibility) query.visibility = visibility;

    // Public users can only see active/public campaigns
    if (!req.user || !req.user.role?.name === 'admin') {
      query.status = 'active';
      query.visibility = 'public';
    }

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const total = await Campaign.countDocuments(query);
    const campaigns = await Campaign.find(query)
      .populate('createdBy', 'name email')
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const pages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      campaigns,
      pagination: {
        total,
        pages,
        currentPage: pageNum,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('[CAMPAIGN-GET-ALL] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaigns',
      error: error.message
    });
  }
});

// ============================================
// GET SINGLE CAMPAIGN
// ============================================
exports.getCampaign = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    console.log('[CAMPAIGN-GET] Fetching campaign:', id);

    const campaign = await Campaign.findById(id).populate('createdBy', 'name email');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Check visibility for non-admin users
    if (campaign.status === 'draft') {
      if (!req.user || (req.user.role?.name !== 'admin' && req.user._id.toString() !== campaign.createdBy._id.toString())) {
        return res.status(404).json({
          success: false,
          message: 'Campaign not found'
        });
      }
    }

    // Members-only require login
    if (campaign.visibility === 'members-only' && !req.user) {
      return res.status(401).json({
        success: false,
        message: 'Login required'
      });
    }

    res.json({
      success: true,
      campaign
    });

  } catch (error) {
    console.error('[CAMPAIGN-GET] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign',
      error: error.message
    });
  }
});

// ============================================
// UPDATE CAMPAIGN (Admin only)
// ============================================
exports.updateCampaign = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('[CAMPAIGN-UPDATE] Updating campaign:', id);

    const campaign = await Campaign.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Validate dates if provided
    if (updates.startDate && updates.endDate) {
      if (new Date(updates.startDate) >= new Date(updates.endDate)) {
        return res.status(400).json({
          success: false,
          message: 'Start date must be before end date'
        });
      }
    }

    // Update allowed fields
    const allowedFields = ['title', 'description', 'goalAmount', 'campaignType', 'startDate', 'endDate', 'status', 'visibility', 'allowPledges', 'isFeatured', 'imageUrl', 'impactStatement', 'milestones'];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        campaign[field] = updates[field];
      }
    });

    await campaign.save();

    // ✅ SYNC TO SUPABASE
    if (campaign.supabaseId) {
      const supabaseUpdates = {};
      if (updates.title !== undefined) supabaseUpdates.title = updates.title;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;
      if (updates.goalAmount !== undefined) supabaseUpdates.goal_amount = updates.goalAmount;
      if (updates.campaignType !== undefined) supabaseUpdates.campaign_type = updates.campaignType;
      if (updates.startDate !== undefined) supabaseUpdates.start_date = updates.startDate;
      if (updates.endDate !== undefined) supabaseUpdates.end_date = updates.endDate;
      if (updates.status !== undefined) supabaseUpdates.status = updates.status;
      if (updates.visibility !== undefined) supabaseUpdates.visibility = updates.visibility;
      if (updates.allowPledges !== undefined) supabaseUpdates.allow_pledges = updates.allowPledges;
      if (updates.isFeatured !== undefined) supabaseUpdates.is_featured = updates.isFeatured;
      if (updates.imageUrl !== undefined) supabaseUpdates.image_url = updates.imageUrl;

      const { error: supabaseError } = await supabase
        .from('campaigns')
        .update(supabaseUpdates)
        .eq('id', campaign.supabaseId);

      if (supabaseError) {
        console.error('[CAMPAIGN-UPDATE] Supabase sync error:', supabaseError);
      }
    }

    console.log('[CAMPAIGN-UPDATE] Campaign updated:', campaign._id);

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      campaign
    });

  } catch (error) {
    console.error('[CAMPAIGN-UPDATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update campaign',
      error: error.message
    });
  }
});

// ============================================
// ACTIVATE CAMPAIGN (Draft -> Active)
// ============================================
exports.activateCampaign = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    console.log('[CAMPAIGN-ACTIVATE] Activating campaign:', id);

    const campaign = await Campaign.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    if (campaign.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft campaigns can be activated'
      });
    }

    campaign.status = 'active';
    await campaign.save();

    // ✅ SYNC TO SUPABASE
    if (campaign.supabaseId) {
      await supabase
        .from('campaigns')
        .update({ status: 'active' })
        .eq('id', campaign.supabaseId);
    }

    console.log('[CAMPAIGN-ACTIVATE] Campaign activated:', campaign._id);

    res.json({
      success: true,
      message: 'Campaign activated successfully',
      campaign
    });

  } catch (error) {
    console.error('[CAMPAIGN-ACTIVATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate campaign',
      error: error.message
    });
  }
});

// ============================================
// GET CAMPAIGN ANALYTICS (Pledges + Contributions)
// ============================================
exports.getCampaignAnalytics = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    console.log('[CAMPAIGN-ANALYTICS] Fetching analytics for:', id);

    const campaign = await Campaign.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    if (!campaign.supabaseId) {
      return res.json({
        success: true,
        analytics: {
          totalPledged: 0,
          totalPaidFromPledges: 0,
          remainingPledges: 0,
          totalDirectContributions: 0,
          totalRaised: 0,
          pledgeCount: 0,
          contributionCount: 0
        }
      });
    }

    // ✅ Get pledge statistics
    const { data: pledgeStats, error: pledgeError } = await supabase
      .from('pledges')
      .select('pledged_amount, paid_amount, remaining_amount')
      .eq('campaign_id', campaign.supabaseId);

    if (pledgeError) {
      console.error('[CAMPAIGN-ANALYTICS] Pledge error:', pledgeError);
    }

    // ✅ Get direct contribution statistics
    const { data: contributionStats, error: contribError } = await supabase
      .from('contributions')
      .select('amount')
      .eq('campaign_id', campaign.supabaseId)
      .eq('status', 'verified');

    if (contribError) {
      console.error('[CAMPAIGN-ANALYTICS] Contribution error:', contribError);
    }

    // ✅ Calculate totals
    const totalPledged = (pledgeStats || []).reduce((sum, p) => sum + Number(p.pledged_amount || 0), 0);
    const totalPaidFromPledges = (pledgeStats || []).reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
    const remainingPledges = (pledgeStats || []).reduce((sum, p) => sum + Number(p.remaining_amount || 0), 0);
    const totalDirectContributions = (contributionStats || []).reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const totalRaised = totalPaidFromPledges + totalDirectContributions;

    // ✅ Update MongoDB campaign with calculated amount
    campaign.currentAmount = totalRaised;
    await campaign.save();

    // ✅ Update Supabase campaign
    await supabase
      .from('campaigns')
      .update({ current_amount: totalRaised })
      .eq('id', campaign.supabaseId);

    res.json({
      success: true,
      analytics: {
        totalPledged,
        totalPaidFromPledges,
        remainingPledges,
        totalDirectContributions,
        totalRaised,
        pledgeCount: (pledgeStats || []).length,
        contributionCount: (contributionStats || []).length
      }
    });

  } catch (error) {
    console.error('[CAMPAIGN-ANALYTICS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign analytics',
      error: error.message
    });
  }
});

// ============================================
// COMPLETE CAMPAIGN (Active -> Completed)
// ============================================
exports.completeCampaign = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    console.log('[CAMPAIGN-COMPLETE] Completing campaign:', id);

    const campaign = await Campaign.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    if (campaign.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active campaigns can be completed'
      });
    }

    campaign.status = 'completed';
    await campaign.save();

    // ✅ SYNC TO SUPABASE
    if (campaign.supabaseId) {
      await supabase
        .from('campaigns')
        .update({ status: 'completed' })
        .eq('id', campaign.supabaseId);
    }

    console.log('[CAMPAIGN-COMPLETE] Campaign completed:', campaign._id);

    res.json({
      success: true,
      message: 'Campaign completed successfully',
      campaign
    });

  } catch (error) {
    console.error('[CAMPAIGN-COMPLETE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete campaign',
      error: error.message
    });
  }
});

// ============================================
// ARCHIVE CAMPAIGN
// ============================================
exports.archiveCampaign = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    console.log('[CAMPAIGN-ARCHIVE] Archiving campaign:', id);

    const campaign = await Campaign.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    campaign.status = 'archived';
    await campaign.save();

    // ✅ SYNC TO SUPABASE
    if (campaign.supabaseId) {
      await supabase
        .from('campaigns')
        .update({ status: 'archived' })
        .eq('id', campaign.supabaseId);
    }

    console.log('[CAMPAIGN-ARCHIVE] Campaign archived:', campaign._id);

    res.json({
      success: true,
      message: 'Campaign archived successfully',
      campaign
    });

  } catch (error) {
    console.error('[CAMPAIGN-ARCHIVE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive campaign',
      error: error.message
    });
  }
});

// ============================================
// DELETE CAMPAIGN (Admin only)
// ============================================
exports.deleteCampaign = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    console.log('[CAMPAIGN-DELETE] Deleting campaign:', id);

    const campaign = await Campaign.findById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // ✅ DELETE FROM SUPABASE FIRST (CASCADE will delete pledges/payments)
    if (campaign.supabaseId) {
      await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaign.supabaseId);
    }

    await Campaign.findByIdAndDelete(id);

    console.log('[CAMPAIGN-DELETE] Campaign deleted:', id);

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });

  } catch (error) {
    console.error('[CAMPAIGN-DELETE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete campaign',
      error: error.message
    });
  }
});

// ============================================
// GET FEATURED CAMPAIGNS (Public)
// ============================================
exports.getFeaturedCampaigns = asyncHandler(async (req, res) => {
  try {
    console.log('[CAMPAIGN-FEATURED] Fetching featured campaigns');

    const campaigns = await Campaign.find({
      isFeatured: true,
      status: 'active',
      visibility: 'public'
    })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(5);

    res.json({
      success: true,
      campaigns
    });

  } catch (error) {
    console.error('[CAMPAIGN-FEATURED] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured campaigns',
      error: error.message
    });
  }
});