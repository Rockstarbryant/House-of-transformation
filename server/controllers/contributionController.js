// server/controllers/contributionController.js - ✅ MIRRORS PLEDGE PAYMENT PATTERN
const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');
const asyncHandler = require('../middleware/asyncHandler');
const Campaign = require('../models/Campaign');
const Settings = require('../models/Settings');
const TransactionAuditLog = require('../models/TransactionAuditLog');
const MpesaService = require('../services/mpesaService');
const DOMPurify = require('isomorphic-dompurify');
const validator = require('validator');

const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY
);

// ============================================
// CONFIGURATION
// ============================================
const MIN_AMOUNT = 10;
const MAX_AMOUNT = 500000;
const DUPLICATE_WINDOW_MINUTES = 8;

// ============================================
// HELPER: Check idempotency
// ============================================
async function isContributionAlreadyProcessed(idempotencyKey, userId) {
  try {
    const { data: existing, error } = await supabase
      .from('contributions')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[CONTRIBUTION-IDEMPOTENCY] Error:', error);
    }

    return error ? null : existing;
  } catch (error) {
    return null;
  }
}

// ============================================
// HELPER: Sanitize inputs
// ============================================
function sanitizeInput(data) {
  const sanitized = { ...data };
  
  if (sanitized.contributorName) {
    sanitized.contributorName = DOMPurify.sanitize(sanitized.contributorName);
  }
  
  if (sanitized.contributorEmail) {
    sanitized.contributorEmail = validator.normalizeEmail(sanitized.contributorEmail) || null;
    if (sanitized.contributorEmail && !validator.isEmail(sanitized.contributorEmail)) {
      sanitized.contributorEmail = null;
    }
  }
  
  if (sanitized.notes) {
    sanitized.notes = DOMPurify.sanitize(sanitized.notes);
  }
  
  return sanitized;
}

// ============================================
// HELPER: Validate amount
// ============================================
function validateAmount(amount) {
  if (!amount || isNaN(amount) || amount <= 0) {
    return { valid: false, message: 'Invalid amount' };
  }
  
  if (amount < MIN_AMOUNT) {
    return { valid: false, message: `Minimum contribution is KES ${MIN_AMOUNT}` };
  }
  
  if (amount > MAX_AMOUNT) {
    return { valid: false, message: `Maximum contribution is KES ${MAX_AMOUNT}` };
  }
  
  return { valid: true };
}

// ============================================
// HELPER: Enrich contributions
// ============================================
async function enrichContributions(contributions) {
  if (!contributions || contributions.length === 0) {
    return [];
  }

  // Get campaigns
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

  // Get users
  const User = require('../models/User');
  const createdByIds = [...new Set(contributions.map(c => c.created_by_id).filter(Boolean))];
  const verifiedByIds = [...new Set(contributions.map(c => c.verified_by_id).filter(Boolean))];
  const allUserIds = [...new Set([...createdByIds, ...verifiedByIds])];

  let users = [];
  if (allUserIds.length > 0) {
    users = await User.find({ _id: { $in: allUserIds } }).select('_id firstName lastName name fullName email');
  }

  const userMap = {};
  users.forEach(u => {
    let userName = 'Unknown User';
    if (u.name) userName = u.name;
    else if (u.fullName) userName = u.fullName;
    else if (u.firstName && u.lastName) userName = `${u.firstName} ${u.lastName}`;
    else if (u.firstName) userName = u.firstName;
    else if (u.email) userName = u.email.split('@')[0];
    userMap[u._id.toString()] = userName.trim();
  });

  return contributions.map(c => {
    const campaign = campaignMap[c.campaign_id];
    return {
      ...c,
      campaign_title: campaign?.title || null,
      campaign_type: campaign?.campaign_type || null,
      campaign_status: campaign?.status || null,
      created_by_name: c.created_by_id ? userMap[c.created_by_id] || 'Unknown' : null,
      verified_by_name: c.verified_by_id ? userMap[c.verified_by_id] || 'Unknown' : null
    };
  });
}

// ============================================
// CREATE CONTRIBUTION (Cash/Bank only)
// ============================================
exports.createContribution = asyncHandler(async (req, res) => {
  try {
    const sanitizedData = sanitizeInput(req.body);
    const {
      campaignId,
      contributorName,
      contributorEmail,
      contributorPhone,
      amount,
      paymentMethod,
      notes,
      isAnonymous
    } = sanitizedData;

    // Validate
    if (!campaignId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Campaign ID, amount, and payment method are required'
      });
    }

    // ✅ CRITICAL: Only allow cash/bank through this endpoint
    if (paymentMethod === 'mpesa') {
      return res.status(400).json({
        success: false,
        message: 'M-Pesa payments must use /mpesa/initiate endpoint'
      });
    }

    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid) {
      return res.status(400).json({
        success: false,
        message: amountValidation.message
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
    if (!campaign || !campaign.supabaseId) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    if (campaign.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Campaign is not active' });
    }

    // Check for duplicates (cash/bank only)
    const windowStart = new Date(Date.now() - DUPLICATE_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { data: recentContrib } = await supabase
      .from('contributions')
      .select('*')
      .eq('contributor_name', contributorName || 'Anonymous')
      .eq('amount', amount)
      .eq('campaign_id', campaign.supabaseId)
      .eq('payment_method', paymentMethod)
      .gte('created_at', windowStart)
      .limit(1);

    if (recentContrib && recentContrib.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Duplicate contribution detected! A ${paymentMethod} contribution of KES ${amount} was recorded recently.`
      });
    }

    // Auto-verify for admin
    const isAdmin = req.user && (
      req.user.role?.name === 'admin' || 
      req.user.role?.permissions?.includes('manage:donations')
    );

    let initialStatus = 'pending';
    let verifiedAt = null;
    let verifiedById = null;

    if (isAdmin) {
      initialStatus = 'verified';
      verifiedAt = new Date().toISOString();
      verifiedById = req.user._id.toString();
    }

    // Create contribution
    const { data, error } = await supabase
      .from('contributions')
      .insert([{
        campaign_id: campaign.supabaseId,
        contributor_name: contributorName || 'Anonymous',
        contributor_email: isAnonymous ? null : (contributorEmail || null),
        contributor_phone: isAnonymous ? null : (contributorPhone || null),
        amount: amount,
        payment_method: paymentMethod,
        notes: notes || null,
        is_anonymous: isAnonymous || false,
        status: initialStatus,
        verified_at: verifiedAt,
        verified_by_id: verifiedById,
        created_by_id: req.user?._id?.toString() || null,
        user_id: req.user?._id?.toString() || null
      }])
      .select()
      .single();

    if (error) {
      console.error('[CONTRIBUTION-CREATE] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to record contribution'
      });
    }

    // Audit log
    await TransactionAuditLog.logTransaction({
      transactionType: 'contribution',
      transactionId: data.id,
      userId: req.user?._id?.toString() || 'anonymous',
      action: isAdmin ? 'admin_contribution_created' : 'contribution_created',
      amount: amount,
      paymentMethod: paymentMethod,
      status: initialStatus
    }).catch(err => console.error('[AUDIT] Error:', err));

    const enriched = await enrichContributions([data]);
    
    res.status(201).json({
      success: true,
      message: initialStatus === 'verified' 
        ? 'Contribution verified and recorded successfully'
        : 'Contribution recorded successfully',
      contribution: enriched[0]
    });

  } catch (error) {
    console.error('[CONTRIBUTION-CREATE] Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while recording the contribution'
    });
  }
});

// ============================================
// INITIATE M-PESA CONTRIBUTION - ✅ MIRRORS PLEDGE PAYMENT
// ============================================
exports.initiateMpesaContributionPayment = asyncHandler(async (req, res) => {
  const requestId = `contrib_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { campaignId, amount, phoneNumber } = req.body;
    const idempotencyKey = req.idempotencyKey || req.headers['idempotency-key'];
    const userId = req.user?._id?.toString() || 'anonymous';

    console.log('[CONTRIBUTION-MPESA] Request ID:', requestId);
    console.log('[CONTRIBUTION-MPESA] Campaign:', campaignId);

    // ✅ IDEMPOTENCY CHECK (mirrors pledge payment)
    if (idempotencyKey && userId !== 'anonymous') {
      const existingContrib = await isContributionAlreadyProcessed(idempotencyKey, userId);
      if (existingContrib) {
        console.log('[CONTRIBUTION-MPESA] Duplicate request:', idempotencyKey);
        
        if (existingContrib.status === 'pending' || existingContrib.status === 'verified') {
          return res.json({
            success: true,
            message: 'Payment already initiated',
            isDuplicate: true,
            contributionId: existingContrib.id,
            status: existingContrib.status
          });
        }
      }
    }

    // Validate inputs
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
        message: 'Invalid phone number. Format: 254XXXXXXXXX'
      });
    }

    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid) {
      return res.status(400).json({
        success: false,
        message: amountValidation.message
      });
    }

    // Get campaign
    const campaign = await Campaign.findById(campaignId);
    if (!campaign || !campaign.supabaseId) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Get M-Pesa settings
    const settings = await Settings.getSettings();
    const mpesa = settings.paymentSettings.mpesa;

    if (!mpesa.enabled) {
      return res.status(400).json({ success: false, message: 'M-Pesa not enabled' });
    }

    // ✅ CRITICAL FIX: DON'T CREATE CONTRIBUTION YET
    // Only create after callback confirms payment (mirrors pledge payment)

    // Initiate STK Push
    const mpesaService = new MpesaService(mpesa);
    
    try {
      const mpesaResult = await mpesaService.initiateSTKPush(
        phoneNumber,
        amount,
        `CONTRIB_${campaign.supabaseId.substring(0, 8)}`,
        `Donation to ${campaign.title.substring(0, 20)}`
      );

      console.log('[CONTRIBUTION-MPESA] STK initiated:', mpesaResult.checkoutRequestId);

      // Store metadata for callback matching
      await TransactionAuditLog.create({
        transactionType: 'mpesa_stk_push',
        transactionId: mpesaResult.checkoutRequestId,
        userId: userId,
        action: 'contribution_stk_initiated',
        amount: amount,
        paymentMethod: 'mpesa',
        status: 'pending',
        metadata: {
          phoneNumber: phoneNumber,
          campaignId: campaignId,
          campaignSupabaseId: campaign.supabaseId,
          checkoutRequestId: mpesaResult.checkoutRequestId,
          merchantRequestId: mpesaResult.merchantRequestId,
          idempotencyKey: idempotencyKey
        }
      }).catch(err => console.error('[AUDIT] Error:', err));

      res.json({
        success: true,
        message: 'M-Pesa payment initiated successfully',
        data: {
          checkoutRequestId: mpesaResult.checkoutRequestId,
          merchantRequestId: mpesaResult.merchantRequestId,
          responseCode: mpesaResult.responseCode,
          responseDescription: mpesaResult.responseDescription,
          phoneNumber: phoneNumber,
          amount: amount
        }
      });

    } catch (mpesaError) {
      console.error('[CONTRIBUTION-MPESA] STK Push failed:', mpesaError);
      
      await TransactionAuditLog.create({
        transactionType: 'mpesa_stk_push',
        transactionId: requestId,
        userId: userId,
        action: 'contribution_stk_failed',
        amount: amount,
        paymentMethod: 'mpesa',
        status: 'failed',
        metadata: {
          error: mpesaError.message,
          phoneNumber: phoneNumber,
          campaignId: campaignId
        }
      }).catch(err => console.error('[AUDIT] Error:', err));

      return res.status(500).json({
        success: false,
        message: 'Failed to initiate M-Pesa payment. Please try again.'
      });
    }

  } catch (error) {
    console.error('[CONTRIBUTION-MPESA] Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while initiating the payment'
    });
  }
});


// ============================================
// GET ALL CONTRIBUTIONS
// ============================================
exports.getAllContributions = asyncHandler(async (req, res) => {
  try {
    // ✅ CRITICAL: Add permission check
    const isAdmin = req.user && req.user.role?.name === 'admin';
    const hasManageDonations = req.user && (
      req.user.role?.permissions?.includes('manage:donations') ||
      req.user.role?.permissions?.includes('view:donations')
    );

    if (!isAdmin && !hasManageDonations) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Insufficient permissions',
        requiredPermissions: ['manage:donations', 'view:donations'],
        userPermissions: req.user?.role?.permissions || [],
        userRole: req.user?.role?.name || 'none'
      });
    }

    const { status, paymentMethod, campaignId, page = 1, limit = 100 } = req.query;

    let query = supabase.from('contributions').select('*', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (paymentMethod) query = query.eq('payment_method', paymentMethod);
    if (campaignId) query = query.eq('campaign_id', campaignId);

    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('[GET-CONTRIBUTIONS] Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch contributions' });
    }

    const enriched = await enrichContributions(data || []);

    res.json({
      success: true,
      contributions: enriched,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('[GET-CONTRIBUTIONS] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contributions' });
  }
});

// ============================================
// VERIFY CONTRIBUTION
// ============================================
exports.verifyContribution = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

     // ✅ CRITICAL: Add permission check
    const isAdmin = req.user && req.user.role?.name === 'admin';
    const hasManageDonations = req.user && 
      req.user.role?.permissions?.includes('manage:donations');

    if (!isAdmin && !hasManageDonations) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only admins can verify contributions',
        requiredPermissions: ['manage:donations'],
        userRole: req.user?.role?.name || 'none'
      });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('contributions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return res.status(404).json({ success: false, message: 'Contribution not found' });
    }

    if (existing.status === 'verified') {
      return res.status(400).json({ success: false, message: 'Already verified' });
    }

    const { data: updated, error: updateError } = await supabase
      .from('contributions')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
        verified_by_id: req.user._id.toString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[VERIFY] Error:', updateError);
      return res.status(500).json({ success: false, message: 'Failed to verify' });
    }

    const [enriched] = await enrichContributions([updated]);

    await TransactionAuditLog.logTransaction({
      transactionType: 'contribution',
      transactionId: id,
      userId: req.user._id.toString(),
      action: 'contribution_verified',
      amount: existing.amount,
      paymentMethod: existing.payment_method,
      status: 'success'
    }).catch(err => console.error('[AUDIT] Error:', err));

    res.json({ 
      success: true, 
      message: 'Contribution verified successfully',
      contribution: enriched 
    });

  } catch (error) {
    console.error('[VERIFY] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify' });
  }
});

// ============================================
// UPDATE CONTRIBUTION
// ============================================
exports.updateContribution = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const sanitized = sanitizeInput(req.body);
    const { contributorName, contributorEmail, contributorPhone, amount, notes } = sanitized;

    const { data: existing } = await supabase
      .from('contributions')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    if (existing.payment_method === 'mpesa') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit M-Pesa contributions'
      });
    }

    if (existing.status === 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit verified contributions'
      });
    }

    if (amount !== undefined) {
      const validation = validateAmount(amount);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
      }
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
      return res.status(500).json({ success: false, message: 'Failed to update' });
    }

    res.json({ success: true, contribution: data });

  } catch (error) {
    console.error('[UPDATE] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update' });
  }
});

// ============================================
// DELETE CONTRIBUTION - ✅ ENHANCED RULES
// ============================================
exports.deleteContribution = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existing } = await supabase
      .from('contributions')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }

    // ✅ NEW RULE: Can delete failed, cancelled, or recent pending
    const canDelete = 
      existing.status === 'failed' ||
      existing.status === 'cancelled' ||
      (existing.status === 'pending' && 
       existing.payment_method !== 'mpesa') || // Can delete pending cash/bank
      (existing.status === 'pending' && 
       existing.payment_method === 'mpesa' &&
       !existing.mpesa_ref); // Can delete M-Pesa if no checkout ID yet

    if (!canDelete) {
      return res.status(400).json({
        success: false,
        message: existing.status === 'verified'
          ? 'Cannot delete verified contributions'
          : 'Cannot delete M-Pesa payment awaiting callback'
      });
    }

    await supabase.from('contributions').delete().eq('id', id);

    await TransactionAuditLog.logTransaction({
      transactionType: 'contribution',
      transactionId: id,
      userId: req.user._id.toString(),
      action: 'contribution_deleted',
      amount: existing.amount,
      paymentMethod: existing.payment_method,
      status: 'success'
    }).catch(err => console.error('[AUDIT] Error:', err));

    res.json({ success: true, message: 'Contribution deleted successfully' });

  } catch (error) {
    console.error('[DELETE] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete' });
  }
});

module.exports = exports;