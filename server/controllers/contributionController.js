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
/*
    if (paymentMethod === 'mpesa' && !mpesaRef) {
      return res.status(400).json({
        success: false,
        message: 'M-Pesa reference required'
      });
    }
*/
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

    

// VALIDATE M-PESA IF PAYMENT METHOD IS MPESA
if (paymentMethod === 'mpesa') {
  const Settings = require('../models/Settings');
  const settings = await Settings.getSettings();
  const mpesa = settings.paymentSettings.mpesa;

  if (!mpesa.enabled) {
    return res.status(400).json({
      success: false,
      message: 'M-Pesa payments are not enabled'
    });
  }

  if (!mpesa.consumerKey || !mpesa.consumerSecret || !mpesa.shortcode || !mpesa.passkey) {
    return res.status(400).json({
      success: false,
      message: 'M-Pesa is not properly configured. Contact admin.'
    });
  }

  // Generate timestamp and password for M-Pesa
  const timestamp = new Date().toISOString().replace(/[:-]/g, '').split('.')[0];
  const passwordString = mpesa.shortcode + mpesa.passkey + timestamp;
  const password = Buffer.from(passwordString).toString('base64');

  console.log('[CONTRIBUTION-CREATE] M-Pesa credentials validated');
  console.log('[CONTRIBUTION-CREATE] Environment:', mpesa.environment);
  console.log('[CONTRIBUTION-CREATE] Transaction Type:', mpesa.transactionType);
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

// ============================================
// INITIATE M-PESA PAYMENT FOR CONTRIBUTION
// ============================================
exports.initiateMpesaContributionPayment = asyncHandler(async (req, res) => {
  try {
    const { campaignId, amount, phoneNumber } = req.body;

    console.log('[CONTRIBUTION-MPESA-INITIATE] Initiating M-Pesa payment for campaign:', campaignId);

    // Validate required fields
    if (!campaignId || !amount || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Campaign ID, amount, and phone number are required'
      });
    }

    // Validate phone number format (Kenya)
    const phoneRegex = /^254\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Must be in format: 254XXXXXXXXX'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // GET CAMPAIGN FROM MONGODB
    const Campaign = require('../models/Campaign');
    const campaign = await Campaign.findById(campaignId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // GET SUPABASE CAMPAIGN ID
    if (!campaign.supabaseId) {
      return res.status(400).json({
        success: false,
        message: 'Campaign is not synced to Supabase. Please sync campaign first.'
      });
    }

    const supabaseCampaignId = campaign.supabaseId;

    // GET M-PESA SETTINGS FROM DATABASE
    const Settings = require('../models/Settings');
    const settings = await Settings.getSettings();
    const mpesa = settings.paymentSettings.mpesa;

    if (!mpesa.enabled) {
      return res.status(400).json({
        success: false,
        message: 'M-Pesa payments are not enabled'
      });
    }

    // VALIDATE M-PESA CREDENTIALS EXIST
    if (!mpesa.consumerKey || !mpesa.consumerSecret || !mpesa.shortcode || !mpesa.passkey) {
      return res.status(400).json({
        success: false,
        message: 'M-Pesa credentials are not configured. Please configure M-Pesa settings first.',
        missing: {
          consumerKey: !mpesa.consumerKey,
          consumerSecret: !mpesa.consumerSecret,
          shortcode: !mpesa.shortcode,
          passkey: !mpesa.passkey
        }
      });
    }

    // Generate timestamp
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;

    const passwordString = mpesa.shortcode + mpesa.passkey + timestamp;
    const password = Buffer.from(passwordString).toString('base64');

    console.log('[CONTRIBUTION-MPESA-INITIATE] M-Pesa credentials loaded');
    console.log('[CONTRIBUTION-MPESA-INITIATE] Environment:', mpesa.environment);
    console.log('[CONTRIBUTION-MPESA-INITIATE] Party A (Phone):', phoneNumber);
    console.log('[CONTRIBUTION-MPESA-INITIATE] Party B (Shortcode):', mpesa.shortcode);
    console.log('[CONTRIBUTION-MPESA-INITIATE] Amount:', amount);

    // CREATE CONTRIBUTION RECORD IN SUPABASE (status: pending)
    const { data: contribution, error: contributionError } = await supabase
      .from('contributions')
      .insert([{
        campaign_id: supabaseCampaignId,
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
      console.error('[CONTRIBUTION-MPESA-INITIATE] Supabase error:', contributionError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create contribution record',
        error: contributionError.message
      });
    }

    // CALL M-PESA API
    const MpesaService = require('../services/mpesaService');
    const mpesaService = new MpesaService(mpesa);

    try {
      console.log('[CONTRIBUTION-MPESA-INITIATE] Calling M-Pesa API...');
      const mpesaResult = await mpesaService.initiateSTKPush(
        phoneNumber,
        amount,
        `CONTRIB_${contribution.id}`,
        mpesa.transactionDesc
      );

      console.log('[CONTRIBUTION-MPESA-INITIATE] STK Push sent successfully:', mpesaResult);

      // Update contribution with M-Pesa transaction ID
      await supabase
        .from('contributions')
        .update({
          mpesa_ref: mpesaResult.checkoutRequestId
        })
        .eq('id', contribution.id);

      res.json({
        success: true,
        message: 'M-Pesa payment initiated. Check your phone for prompt.',
        contribution: {
          id: contribution.id,
          amount: contribution.amount,
          status: contribution.status,
          phoneNumber: phoneNumber,
          checkoutRequestId: mpesaResult.checkoutRequestId,
          createdAt: contribution.created_at
        }
      });

    } catch (mpesaError) {
      console.error('[CONTRIBUTION-MPESA-INITIATE] M-Pesa API error:', mpesaError);
      
      // Update contribution status to failed
      await supabase
        .from('contributions')
        .update({
          status: 'failed'
        })
        .eq('id', contribution.id);

      return res.status(500).json({
        success: false,
        message: 'Failed to initiate M-Pesa STK push',
        error: mpesaError.message
      });
    }

  } catch (error) {
    console.error('[CONTRIBUTION-MPESA-INITIATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.message
    });
  }
});