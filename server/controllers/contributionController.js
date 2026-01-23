// server/controllers/contributionController.js
const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');
const asyncHandler = require('../middleware/asyncHandler');
const Campaign = require('../models/Campaign');

const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY
);

// CREATE CONTRIBUTION
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

    console.log('[CONTRIBUTION-CREATE] Creating contribution for campaign:', campaignId);

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

    if (!isAnonymous && (!contributorName || !contributorEmail || !contributorPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Contributor details required for non-anonymous contributions'
      });
    }

    if (paymentMethod === 'mpesa' && !mpesaRef) {
      return res.status(400).json({
        success: false,
        message: 'M-Pesa reference required'
      });
    }

    // Get campaign
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

    if (!campaign.supabaseId) {
      return res.status(400).json({
        success: false,
        message: 'Campaign not synced to Supabase'
      });
    }

    // Create contribution in Supabase
    const { data, error } = await supabase
      .from('contributions')
      .insert([{
        campaign_id: campaign.supabaseId,
        contributor_name: contributorName || 'Anonymous',
        contributor_email: isAnonymous ? null : contributorEmail,
        contributor_phone: isAnonymous ? null : contributorPhone,
        amount: amount,
        payment_method: paymentMethod,
        mpesa_ref: mpesaRef || null,
        notes: notes || null,
        is_anonymous: isAnonymous || false,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) {
      console.error('[CONTRIBUTION-CREATE] Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to record contribution',
        error: error.message
      });
    }

    console.log('[CONTRIBUTION-CREATE] Contribution created:', data.id);

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

// GET ALL CONTRIBUTIONS (Admin only)
exports.getAllContributions = asyncHandler(async (req, res) => {
  try {
    const { status, paymentMethod, campaignId, page = 1, limit = 20 } = req.query;

    console.log('[CONTRIBUTION-GET-ALL] Fetching all contributions');

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase.from('contributions').select('*', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (paymentMethod) query = query.eq('payment_method', paymentMethod);
    if (campaignId) query = query.eq('campaign_id', campaignId);

    const { count, error: countError } = await query;

    if (countError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch contributions',
        error: countError.message
      });
    }

    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch contributions',
        error: error.message
      });
    }

    res.json({
      success: true,
      contributions: data,
      pagination: {
        total: count,
        pages: Math.ceil(count / limitNum),
        currentPage: pageNum,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('[CONTRIBUTION-GET-ALL] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contributions'
    });
  }
});

// VERIFY CONTRIBUTION (Admin only)
exports.verifyContribution = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    console.log('[CONTRIBUTION-VERIFY] Verifying contribution:', id);

    const { data, error } = await supabase
      .from('contributions')
      .update({
        status: 'verified',
        verified_by_id: req.user._id,
        verified_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to verify contribution',
        error: error.message
      });
    }

    console.log('[CONTRIBUTION-VERIFY] Contribution verified:', id);

    res.json({
      success: true,
      message: 'Contribution verified successfully',
      contribution: data
    });

  } catch (error) {
    console.error('[CONTRIBUTION-VERIFY] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify contribution'
    });
  }
});