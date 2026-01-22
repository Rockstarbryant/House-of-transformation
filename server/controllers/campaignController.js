// server/controllers/campaignController.js
const Campaign = require('../models/Campaign');
const asyncHandler = require('../middleware/asyncHandler');

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
  initialStatus = 'active'; // ✅ Starts now or in past, ends in future
} else if (end <= now) {
  initialStatus = 'completed'; // Already ended
}

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
  status: initialStatus  // ✅ AUTO-DETERMINED
});

    console.log('[CAMPAIGN-CREATE] Campaign created:', campaign._id);

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
   // Allow public/active campaigns for everyone
// Draft campaigns only for admin/creator
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