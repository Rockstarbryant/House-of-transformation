// server/controllers/contributionController.js - COMPLETE VERSION
const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');
const asyncHandler = require('../middleware/asyncHandler');
const Campaign = require('../models/Campaign');
const TransactionAuditLog = require('../models/TransactionAuditLog');

const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY
);

// ============================================
// HELPER: Check for duplicate recent contributions
// ============================================
async function checkDuplicateContribution(contributorName, amount, campaignId, paymentMethod) {
  // Only check for cash and bank transfers (not M-Pesa STK which auto-generates)
  if (paymentMethod !== 'cash' && paymentMethod !== 'bank_transfer') {
    return null;
  }

  // Check for same contributor, same amount, same campaign within last 8 minutes
  const eightMinutesAgo = new Date(Date.now() - 8 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('contributions')
    .select('*')
    .eq('contributor_name', contributorName)
    .eq('amount', amount)
    .eq('campaign_id', campaignId)
    .eq('payment_method', paymentMethod)
    .gte('created_at', eightMinutesAgo)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[DUPLICATE-CHECK] Error:', error);
    return null;
  }

  return data && data.length > 0 ? data[0] : null;
}

// ============================================
// CREATE CONTRIBUTION
// ============================================
exports.createContribution = asyncHandler(async (req, res) => {
  try {
    const {
      campaignId,
      contributorName,
      contributorEmail,
      contributorPhone,
      amount,
      paymentMethod,
      mpesaRef,
      notes,
      isAnonymous
    } = req.body;

    console.log('[CONTRIBUTION-CREATE] Creating contribution');

    // Validate
    if (!campaignId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Campaign ID, amount, and payment method are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    if (!isAnonymous && !contributorName) {
      return res.status(400).json({
        success: false,
        message: 'Contributor name is required for non-anonymous contributions'
      });
    }

    // Get campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    if (campaign.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Campaign is not active' });
    }

    if (!campaign.supabaseId) {
      return res.status(400).json({ success: false, message: 'Campaign not synced' });
    }

    // ✅ CHECK FOR DUPLICATES (only for manual entries)
    if (paymentMethod === 'cash' || paymentMethod === 'bank_transfer') {
      const duplicate = await checkDuplicateContribution(
        contributorName || 'Anonymous',
        amount,
        campaign.supabaseId,
        paymentMethod
      );

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `Duplicate contribution detected! A ${paymentMethod} contribution of ${amount} from ${contributorName} was recorded ${Math.round((Date.now() - new Date(duplicate.created_at).getTime()) / 60000)} minutes ago. Please wait at least 8 minutes before adding another identical contribution.`,
          duplicate: {
            id: duplicate.id,
            amount: duplicate.amount,
            created_at: duplicate.created_at
          }
        });
      }
    }

    // ✅ AUTO-VERIFY FOR ADMIN MANUAL ENTRIES
    let initialStatus = 'pending';
    let verifiedAt = null;
    let verifiedById = null;

    const isAdmin = req.user && (
      req.user.role?.name === 'admin' || 
      req.user.role?.permissions?.includes('manage:donations')
    );

    // Admin manually adding cash/bank = auto-verified
    if (isAdmin && (paymentMethod === 'cash' || paymentMethod === 'bank_transfer')) {
      initialStatus = 'verified';
      verifiedAt = new Date().toISOString();
      verifiedById = req.user._id.toString();
    }

    // Build insert data
    const insertData = {
      campaign_id: campaign.supabaseId,
      contributor_name: contributorName || 'Anonymous',
      contributor_email: isAnonymous ? null : (contributorEmail || null),
      contributor_phone: isAnonymous ? null : (contributorPhone || null),
      amount: amount,
      payment_method: paymentMethod,
      mpesa_ref: mpesaRef || null,
      notes: notes || null,
      is_anonymous: isAnonymous || false,
      status: initialStatus,
      verified_at: verifiedAt,
      verified_by_id: verifiedById
    };

    if (req.user && req.user._id) {
      insertData.created_by_id = req.user._id.toString();
    }

    // Create contribution
    const { data, error } = await supabase
      .from('contributions')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[CONTRIBUTION-CREATE] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to record contribution',
        error: error.message
      });
    }

    console.log('[CONTRIBUTION-CREATE] Success:', data.id, 'Status:', data.status);

    // Log to audit trail
    try {
      await TransactionAuditLog.logTransaction({
        transactionType: 'contribution',
        transactionId: data.id,
        userId: req.user?._id?.toString() || 'anonymous',
        action: isAdmin ? 'admin_contribution_created' : 'contribution_created',
        amount: amount,
        paymentMethod: paymentMethod,
        status: initialStatus,
        details: {
          campaignId: campaign._id.toString(),
          campaignTitle: campaign.title,
          contributorName: contributorName || 'Anonymous',
          isAnonymous,
          autoVerified: initialStatus === 'verified'
        }
      });
    } catch (auditError) {
      console.error('[CONTRIBUTION-CREATE] Audit log error:', auditError);
    }

    res.status(201).json({
      success: true,
      message: 'Contribution recorded successfully',
      contribution: data
    });

  } catch (error) {
    console.error('[CONTRIBUTION-CREATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create contribution',
      error: error.message
    });
  }
});

// ============================================
// GET ALL CONTRIBUTIONS (WITH ENRICHMENT)
// ============================================
exports.getAllContributions = asyncHandler(async (req, res) => {
  try {
    const { status, paymentMethod, campaignId, page = 1, limit = 1000 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase.from('contributions').select('*', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (paymentMethod) query = query.eq('payment_method', paymentMethod);
    if (campaignId) query = query.eq('campaign_id', campaignId);

    const { count } = await query;

    const { data: contributions, error } = await supabase
      .from('contributions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    // Enrich with campaign data
    const campaignIds = [...new Set(contributions.map(c => c.campaign_id).filter(Boolean))];
    
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, title, campaign_type, status')
      .in('id', campaignIds);

    const campaignMap = {};
    if (campaigns) {
      campaigns.forEach(c => {
        campaignMap[c.id] = c;
      });
    }

    // Enrich with user data
    const User = require('../models/User');
    const createdByIds = [...new Set(contributions.map(c => c.created_by_id).filter(Boolean))];
    const verifiedByIds = [...new Set(contributions.map(c => c.verified_by_id).filter(Boolean))];
    const allUserIds = [...new Set([...createdByIds, ...verifiedByIds])];

    let usersMap = {};
    if (allUserIds.length > 0) {
      const users = await User.find({ _id: { $in: allUserIds } }).select('_id name email').lean();
      users.forEach(user => {
        usersMap[user._id.toString()] = user;
      });
    }

    // Enrich contributions
    const enriched = contributions.map(contrib => {
      const campaign = campaignMap[contrib.campaign_id];
      const createdBy = usersMap[contrib.created_by_id];
      const verifiedBy = usersMap[contrib.verified_by_id];
      
      return {
        ...contrib,
        campaign_title: campaign?.title || 'General Offering',
        campaign_type: campaign?.campaign_type || null,
        campaign_status: campaign?.status || null,
        created_by_name: createdBy?.name || null,
        created_by_email: createdBy?.email || null,
        verified_by_name: verifiedBy?.name || null,
        verified_by_email: verifiedBy?.email || null
      };
    });

    res.json({
      success: true,
      contributions: enriched,
      pagination: {
        total: count,
        pages: Math.ceil(count / limitNum),
        currentPage: pageNum,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('[CONTRIBUTION-GET-ALL] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contributions' });
  }
});

// ============================================
// VERIFY CONTRIBUTION
// ============================================
exports.verifyContribution = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existing } = await supabase
      .from('contributions')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Contribution not found' });
    }

    if (existing.status === 'verified') {
      return res.status(400).json({ success: false, message: 'Already verified' });
    }

    const { data, error } = await supabase
      .from('contributions')
      .update({
        status: 'verified',
        verified_by_id: req.user._id.toString(),
        verified_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    // Log audit
    try {
      await TransactionAuditLog.logTransaction({
        transactionType: 'contribution',
        transactionId: id,
        userId: req.user._id.toString(),
        action: 'contribution_verified',
        amount: existing.amount,
        paymentMethod: existing.payment_method,
        status: 'success'
      });
    } catch (auditError) {
      console.error('[VERIFY] Audit error:', auditError);
    }

    res.json({ success: true, contribution: data });

  } catch (error) {
    console.error('[VERIFY] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify' });
  }
});

// ============================================
// UPDATE CONTRIBUTION (Cash/Bank only)
// ============================================
exports.updateContribution = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { contributorName, contributorEmail, contributorPhone, amount, notes } = req.body;

    // Get existing
    const { data: existing } = await supabase
      .from('contributions')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Contribution not found' });
    }

    // Only allow editing cash/bank
    if (existing.payment_method === 'mpesa') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit M-Pesa contributions'
      });
    }

    // Only allow editing pending or failed
    if (existing.status === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit verified contributions. Please cancel first.'
      });
    }

    const updates = {};
    if (contributorName !== undefined) updates.contributor_name = contributorName;
    if (contributorEmail !== undefined) updates.contributor_email = contributorEmail;
    if (contributorPhone !== undefined) updates.contributor_phone = contributorPhone;
    if (amount !== undefined) updates.amount = amount;
    if (notes !== undefined) updates.notes = notes;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('contributions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, contribution: data });

  } catch (error) {
    console.error('[UPDATE] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update' });
  }
});

// ============================================
// DELETE CONTRIBUTION (Cash/Bank only)
// ============================================
exports.deleteContribution = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Get existing
    const { data: existing } = await supabase
      .from('contributions')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Contribution not found' });
    }

    // Only allow deleting cash/bank
    if (existing.payment_method === 'mpesa') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete M-Pesa contributions'
      });
    }

    // Cannot delete verified contributions
    if (existing.status === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete verified contributions. Please cancel verification first.'
      });
    }

    const { error } = await supabase
      .from('contributions')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, message: 'Contribution deleted' });

  } catch (error) {
    console.error('[DELETE] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete' });
  }
});

// ============================================
// INITIATE M-PESA PAYMENT
// ============================================
exports.initiateMpesaContributionPayment = asyncHandler(async (req, res) => {
  try {
    const { campaignId, amount, phoneNumber } = req.body;

    if (!campaignId || !amount || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Campaign ID, amount, and phone number are required'
      });
    }

    const phoneRegex = /^254\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Must be: 254XXXXXXXXX'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    const Campaign = require('../models/Campaign');
    const campaign = await Campaign.findById(campaignId);

    if (!campaign || !campaign.supabaseId) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const Settings = require('../models/Settings');
    const settings = await Settings.getSettings();
    const mpesa = settings.paymentSettings.mpesa;

    if (!mpesa.enabled) {
      return res.status(400).json({ success: false, message: 'M-Pesa not enabled' });
    }

    // Create contribution
    const { data: contribution, error: contributionError } = await supabase
      .from('contributions')
      .insert([{
        campaign_id: campaign.supabaseId,
        contributor_name: 'Pending User',
        contributor_phone: phoneNumber,
        amount: amount,
        payment_method: 'mpesa',
        status: 'pending',
        is_anonymous: false
      }])
      .select()
      .single();

    if (contributionError) {
      return res.status(500).json({ success: false, error: contributionError.message });
    }

    // Call M-Pesa
    const MpesaService = require('../services/mpesaService');
    const mpesaService = new MpesaService(mpesa);

    try {
      const mpesaResult = await mpesaService.initiateSTKPush(
        phoneNumber,
        amount,
        `CONTRIB_${contribution.id}`,
        mpesa.transactionDesc
      );

      await supabase
        .from('contributions')
        .update({ mpesa_ref: mpesaResult.checkoutRequestId })
        .eq('id', contribution.id);

      res.json({
        success: true,
        message: 'M-Pesa payment initiated',
        contribution: {
          id: contribution.id,
          amount: contribution.amount,
          checkoutRequestId: mpesaResult.checkoutRequestId
        }
      });

    } catch (mpesaError) {
      await supabase
        .from('contributions')
        .update({ status: 'failed' })
        .eq('id', contribution.id);

      return res.status(500).json({
        success: false,
        message: 'M-Pesa failed',
        error: mpesaError.message
      });
    }

  } catch (error) {
    console.error('[MPESA-INITIATE] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate payment' });
  }
});