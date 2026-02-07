// server/controllers/mpesaCallbackController.js - ✅ NEW FILE
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
// M-PESA RESULT CODES
// ============================================
const MPESA_RESULT_CODES = {
  0: 'success',
  1: 'insufficient_funds',
  1032: 'cancelled',
  1037: 'timeout',
  1001: 'wrong_pin',
  2001: 'invalid_account'
};

// ============================================
// STK PUSH CALLBACK (for Contributions)
// ============================================
exports.handleStkPushCallback = asyncHandler(async (req, res) => {
  try {
    console.log('[MPESA-CALLBACK] Received callback:', JSON.stringify(req.body, null, 2));

    const { Body } = req.body;

    if (!Body || !Body.stkCallback) {
      console.error('[MPESA-CALLBACK] Invalid callback structure');
      // Still respond with 200 to prevent M-Pesa retries
      return res.json({ 
        ResultCode: 0, 
        ResultDesc: 'Accepted' 
      });
    }

    const callback = Body.stkCallback;
    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata
    } = callback;

    console.log('[MPESA-CALLBACK] Processing:', {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc
    });

    // Extract metadata (only available on success)
    let mpesaReceiptNumber = null;
    let transactionDate = null;
    let phoneNumber = null;
    let amount = null;

    if (CallbackMetadata && CallbackMetadata.Item) {
      const items = CallbackMetadata.Item;
      
      items.forEach(item => {
        switch (item.Name) {
          case 'MpesaReceiptNumber':
            mpesaReceiptNumber = item.Value;
            break;
          case 'TransactionDate':
            transactionDate = item.Value;
            break;
          case 'PhoneNumber':
            phoneNumber = String(item.Value);
            break;
          case 'Amount':
            amount = parseFloat(item.Value);
            break;
        }
      });
    }

    // Determine status from result code
    let status = 'failed';
    if (ResultCode === 0) {
      status = 'verified'; // Auto-verify successful M-Pesa payments
    } else if (ResultCode === 1032) {
      status = 'cancelled';
    } else if (ResultCode === 1037) {
      status = 'failed'; // Timeout
    } else {
      status = 'failed';
    }

    console.log('[MPESA-CALLBACK] Determined status:', status, 'Result code:', ResultCode);

    // ============================================
    // STRATEGY 1: Find existing contribution by CheckoutRequestID
    // This works if contribution was pre-created (old flow)
    // ============================================
    let contribution = null;
    const { data: existingContrib } = await supabase
      .from('contributions')
      .select('*')
      .eq('mpesa_ref', CheckoutRequestID)
      .single();

    if (existingContrib) {
      console.log('[MPESA-CALLBACK] Found existing contribution:', existingContrib.id);
      
      // Update existing contribution
      const updates = {
        status: status,
        updated_at: new Date().toISOString()
      };

      if (status === 'verified') {
        updates.verified_at = new Date().toISOString();
        updates.mpesa_ref = mpesaReceiptNumber; // Update with actual receipt
        
        // Update contributor info if it was "Pending User"
        if (existingContrib.contributor_name === 'Pending User' && phoneNumber) {
          updates.contributor_name = 'M-Pesa User';
          updates.contributor_phone = phoneNumber;
        }
      }

      const { data: updated, error: updateError } = await supabase
        .from('contributions')
        .update(updates)
        .eq('id', existingContrib.id)
        .select()
        .single();

      if (updateError) {
        console.error('[MPESA-CALLBACK] Update error:', updateError);
      } else {
        contribution = updated;
        console.log('[MPESA-CALLBACK] Updated contribution:', contribution.id);
      }
    } 
    // ============================================
    // STRATEGY 2: Create new contribution (NEW FLOW)
    // This is for when we DON'T pre-create contribution
    // ============================================
    else if (status === 'verified' && mpesaReceiptNumber && amount && phoneNumber) {
      console.log('[MPESA-CALLBACK] Creating new contribution from successful payment');

      // Extract campaign ID from audit log or from AccountReference in callback
      // For now, we'll look up the STK push initiation from audit log
      const auditLog = await TransactionAuditLog.findOne({
        transactionId: CheckoutRequestID,
        transactionType: 'mpesa_stk_push'
      }).sort({ createdAt: -1 });

      if (!auditLog || !auditLog.metadata?.campaignId) {
        console.error('[MPESA-CALLBACK] Cannot find campaign ID from audit log');
        // Log the orphaned payment
        await TransactionAuditLog.create({
          transactionType: 'mpesa_callback',
          transactionId: mpesaReceiptNumber,
          userId: 'system',
          action: 'orphaned_payment',
          amount: amount,
          paymentMethod: 'mpesa',
          status: 'error',
          metadata: {
            CheckoutRequestID,
            MerchantRequestID,
            phoneNumber,
            reason: 'Campaign ID not found'
          }
        });
        
        return res.json({ ResultCode: 0, ResultDesc: 'Accepted but not processed' });
      }

      // Get campaign
      const campaign = await Campaign.findById(auditLog.metadata.campaignId);
      if (!campaign || !campaign.supabaseId) {
        console.error('[MPESA-CALLBACK] Campaign not found:', auditLog.metadata.campaignId);
        return res.json({ ResultCode: 0, ResultDesc: 'Accepted but campaign not found' });
      }

      // Create the contribution
      const { data: newContrib, error: createError } = await supabase
        .from('contributions')
        .insert([{
          campaign_id: campaign.supabaseId,
          contributor_name: 'M-Pesa User',
          contributor_phone: phoneNumber,
          amount: amount,
          payment_method: 'mpesa',
          mpesa_ref: mpesaReceiptNumber,
          status: 'verified',
          verified_at: new Date().toISOString(),
          is_anonymous: false,
          notes: `Auto-verified M-Pesa payment. Transaction ID: ${mpesaReceiptNumber}`
        }])
        .select()
        .single();

      if (createError) {
        console.error('[MPESA-CALLBACK] Create error:', createError);
      } else {
        contribution = newContrib;
        console.log('[MPESA-CALLBACK] Created new contribution:', contribution.id);
      }
    } else {
      console.log('[MPESA-CALLBACK] Payment not successful or missing data, not creating contribution');
    }

    // Log callback to audit trail
    try {
      await TransactionAuditLog.create({
        transactionType: 'mpesa_callback',
        transactionId: mpesaReceiptNumber || CheckoutRequestID,
        userId: 'system',
        action: 'mpesa_callback_received',
        amount: amount || 0,
        paymentMethod: 'mpesa',
        status: status,
        metadata: {
          MerchantRequestID,
          CheckoutRequestID,
          ResultCode,
          ResultDesc,
          mpesaReceiptNumber,
          transactionDate,
          phoneNumber,
          contributionId: contribution?.id || null
        }
      });
    } catch (auditError) {
      console.error('[MPESA-CALLBACK] Audit error:', auditError);
    }

    // Always respond with success to prevent M-Pesa retries
    res.json({
      ResultCode: 0,
      ResultDesc: 'Callback processed successfully'
    });

  } catch (error) {
    console.error('[MPESA-CALLBACK] Unexpected error:', error);
    
    // Still respond with success to prevent retries
    res.json({
      ResultCode: 0,
      ResultDesc: 'Accepted'
    });
  }
});

// ============================================
// C2B VALIDATION (When user pays directly to paybill)
// ============================================
exports.handleC2BValidation = asyncHandler(async (req, res) => {
  try {
    console.log('[C2B-VALIDATION] Received:', JSON.stringify(req.body, null, 2));

    const {
      TransID,
      TransTime,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      InvoiceNumber,
      MSISDN,
      FirstName,
      MiddleName,
      LastName,
      ThirdPartyTransID
    } = req.body;

    // Log to audit trail
    try {
      await TransactionAuditLog.create({
        transactionType: 'mpesa_c2b_validation',
        transactionId: TransID,
        userId: 'system',
        action: 'c2b_validation_received',
        amount: TransAmount,
        paymentMethod: 'mpesa',
        status: 'pending',
        metadata: {
          TransTime,
          BusinessShortCode,
          BillRefNumber,
          MSISDN,
          FirstName,
          LastName
        }
      });
    } catch (auditError) {
      console.error('[C2B-VALIDATION] Audit error:', auditError);
    }

    // Validate BillRefNumber is a valid campaign ID or "GENERAL"
    if (BillRefNumber) {
      // Try to find campaign by BillRefNumber
      const campaign = await Campaign.findOne({
        $or: [
          { _id: BillRefNumber },
          { supabaseId: BillRefNumber },
          { shortCode: BillRefNumber }
        ]
      });

      if (!campaign && BillRefNumber !== 'GENERAL') {
        console.log('[C2B-VALIDATION] Invalid campaign reference:', BillRefNumber);
        return res.json({
          ResultCode: '1',
          ResultDesc: 'Invalid account number. Please use valid campaign ID or GENERAL.'
        });
      }
    }

    // Accept the payment
    res.json({
      ResultCode: '0',
      ResultDesc: 'Accepted'
    });

  } catch (error) {
    console.error('[C2B-VALIDATION] Error:', error);
    
    // Reject on error to be safe
    res.json({
      ResultCode: '1',
      ResultDesc: 'System error. Please try again.'
    });
  }
});

// ============================================
// C2B CONFIRMATION (Create contribution after validation)
// ============================================
exports.handleC2BConfirmation = asyncHandler(async (req, res) => {
  try {
    console.log('[C2B-CONFIRMATION] Received:', JSON.stringify(req.body, null, 2));

    const {
      TransID,
      TransTime,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      InvoiceNumber,
      MSISDN,
      FirstName,
      MiddleName,
      LastName,
      OrgAccountBalance,
      ThirdPartyTransID
    } = req.body;

    // Check for duplicate transaction
    const { data: existingContrib } = await supabase
      .from('contributions')
      .select('*')
      .eq('mpesa_ref', TransID)
      .single();

    if (existingContrib) {
      console.log('[C2B-CONFIRMATION] Duplicate transaction, skipping:', TransID);
      return res.json({
        ResultCode: '0',
        ResultDesc: 'Duplicate transaction'
      });
    }

    // Find campaign
    let campaign = null;
    if (BillRefNumber && BillRefNumber !== 'GENERAL') {
      campaign = await Campaign.findOne({
        $or: [
          { _id: BillRefNumber },
          { supabaseId: BillRefNumber },
          { shortCode: BillRefNumber }
        ]
      });
    }

    if (!campaign) {
      // Find a default "General Offerings" campaign or use first active campaign
      campaign = await Campaign.findOne({ 
        $or: [
          { isDefault: true },
          { title: /general/i }
        ],
        status: 'active'
      });
    }

    if (!campaign || !campaign.supabaseId) {
      console.error('[C2B-CONFIRMATION] No valid campaign found');
      
      // Log orphaned payment
      await TransactionAuditLog.create({
        transactionType: 'mpesa_c2b_confirmation',
        transactionId: TransID,
        userId: 'system',
        action: 'orphaned_c2b_payment',
        amount: TransAmount,
        paymentMethod: 'mpesa',
        status: 'error',
        metadata: {
          reason: 'No valid campaign found',
          BillRefNumber,
          MSISDN,
          FirstName,
          LastName
        }
      });

      return res.json({
        ResultCode: '0',
        ResultDesc: 'Accepted but no valid campaign'
      });
    }

    // Create contributor name
    const contributorName = [FirstName, MiddleName, LastName]
      .filter(Boolean)
      .join(' ') || 'M-Pesa User';

    // Create contribution
    const { data: contribution, error: createError } = await supabase
      .from('contributions')
      .insert([{
        campaign_id: campaign.supabaseId,
        contributor_name: contributorName,
        contributor_phone: MSISDN,
        amount: TransAmount,
        payment_method: 'mpesa',
        mpesa_ref: TransID,
        status: 'verified',
        verified_at: new Date().toISOString(),
        is_anonymous: false,
        notes: `C2B Payment - Direct paybill deposit. Ref: ${BillRefNumber || 'GENERAL'}`
      }])
      .select()
      .single();

    if (createError) {
      console.error('[C2B-CONFIRMATION] Create error:', createError);
      
      await TransactionAuditLog.create({
        transactionType: 'mpesa_c2b_confirmation',
        transactionId: TransID,
        userId: 'system',
        action: 'c2b_create_failed',
        amount: TransAmount,
        paymentMethod: 'mpesa',
        status: 'failed',
        metadata: {
          error: createError.message,
          BillRefNumber,
          MSISDN
        }
      });

      return res.json({
        ResultCode: '0',
        ResultDesc: 'Accepted but failed to record'
      });
    }

    console.log('[C2B-CONFIRMATION] Created contribution:', contribution.id);

    // Log success
    await TransactionAuditLog.create({
      transactionType: 'mpesa_c2b_confirmation',
      transactionId: TransID,
      userId: 'system',
      action: 'c2b_contribution_created',
      amount: TransAmount,
      paymentMethod: 'mpesa',
      status: 'success',
      metadata: {
        contributionId: contribution.id,
        campaignId: campaign._id.toString(),
        BillRefNumber,
        MSISDN,
        contributorName
      }
    });

    res.json({
      ResultCode: '0',
      ResultDesc: 'Contribution recorded successfully'
    });

  } catch (error) {
    console.error('[C2B-CONFIRMATION] Error:', error);
    
    // Log error but still acknowledge receipt
    try {
      await TransactionAuditLog.create({
        transactionType: 'mpesa_c2b_confirmation',
        transactionId: req.body.TransID,
        userId: 'system',
        action: 'c2b_error',
        amount: req.body.TransAmount,
        paymentMethod: 'mpesa',
        status: 'error',
        metadata: {
          error: error.message
        }
      });
    } catch (auditError) {
      console.error('[C2B-CONFIRMATION] Audit error:', auditError);
    }

    res.json({
      ResultCode: '0',
      ResultDesc: 'Accepted'
    });
  }
});

// ============================================
// REGISTER C2B URLS (Admin endpoint to register with M-Pesa)
// ============================================
exports.registerC2BUrls = asyncHandler(async (req, res) => {
  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.getSettings();
    const mpesa = settings.paymentSettings.mpesa;

    if (!mpesa.enabled) {
      return res.status(400).json({ 
        success: false, 
        message: 'M-Pesa not enabled' 
      });
    }

    const MpesaService = require('../services/mpesaService');
    const mpesaService = new MpesaService(mpesa);

    const validationUrl = `${process.env.BACKEND_URL || 'https://your-api.com'}/api/mpesa/c2b/validation`;
    const confirmationUrl = `${process.env.BACKEND_URL || 'https://your-api.com'}/api/mpesa/c2b/confirmation`;

    const result = await mpesaService.registerC2BUrls(validationUrl, confirmationUrl);

    res.json({
      success: true,
      message: 'C2B URLs registered successfully',
      result
    });

  } catch (error) {
    console.error('[C2B-REGISTER] Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to register C2B URLs',
      error: error.message
    });
  }
});

module.exports = exports;