// ============================================
// FILE 17: routes/paymentRoutes.js
// ============================================
import express from 'express';
import Payment from '../models/Payment.js';
import Pledge from '../models/Pledge.js';
import Campaign from '../models/Campaign.js';
import Notification from '../models/Notification.js';
import { authenticate, adminOnly } from '../middleware/authMiddleware.js';
import { initiateMpesaPayment, queryMpesaPayment } from '../utils/mpesaService.js';
import { sendSMS, sendEmail } from '../utils/notificationService.js';
import { paymentValidator } from '../utils/validators.js';

const router = express.Router();

// Initiate M-Pesa payment
router.post('/initiate-mpesa', authenticate, async (req, res) => {
  try {
    const { pledgeId, amount, phoneNumber } = req.body;

    if (!pledgeId || !amount || !phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Pledge ID, amount, and phone number required' 
      });
    }

    const pledge = await Pledge.findById(pledgeId);
    if (!pledge) {
      return res.status(404).json({ success: false, error: 'Pledge not found' });
    }

    if (amount > pledge.remainingAmount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Payment amount exceeds remaining balance' 
      });
    }

    // Create pending payment
    const payment = new Payment({
      pledgeId,
      campaignId: pledge.campaignId,
      memberId: req.user._id,
      amount,
      paymentMethod: 'mpesa',
      phoneNumberUsed: phoneNumber,
      status: 'pending'
    });

    await payment.save();

    // Initiate M-Pesa
    const mpesaResponse = await initiateMpesaPayment(
      phoneNumber,
      amount,
      pledgeId.toString(),
      `Donation - Pledge Payment`
    );

    if (mpesaResponse.ResponseCode !== '0') {
      payment.status = 'failed';
      payment.failureReason = mpesaResponse.ResponseDescription;
      await payment.save();
      
      return res.status(400).json({ 
        success: false, 
        error: mpesaResponse.ResponseDescription 
      });
    }

    payment.mpesaRef = mpesaResponse.CheckoutRequestID;
    await payment.save();

    res.json({ 
      success: true, 
      payment,
      checkoutRequestId: mpesaResponse.CheckoutRequestID 
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// M-Pesa callback (webhook)
router.post('/mpesa-callback', async (req, res) => {
  try {
    const { Body } = req.body;
    const result = Body.stkCallback;

    const checkoutRequestId = result.CheckoutRequestID;
    const resultCode = result.ResultCode;

    // Find payment by M-Pesa ref
    const payment = await Payment.findOne({ mpesaRef: checkoutRequestId });
    
    if (!payment) {
      return res.json({ 
        success: false, 
        error: 'Payment not found' 
      });
    }

    if (resultCode === 0) {
      // Payment successful
      payment.status = 'success';
      payment.mpesaTransactionId = result.CallbackMetadata?.Item.find(
        item => item.Name === 'MpesaReceiptNumber'
      )?.Value;
      payment.mpesaReceiptNumber = payment.mpesaTransactionId;
      payment.completedAt = new Date();

      const pledge = await Pledge.findById(payment.pledgeId);
      pledge.paidAmount += payment.amount;
      pledge.remainingAmount = pledge.pledgedAmount - pledge.paidAmount;

      if (pledge.remainingAmount === 0) {
        pledge.status = 'completed';
      } else if (pledge.paidAmount > 0) {
        pledge.status = 'partial';
      }

      await pledge.save();

      // Update campaign
      const campaign = await Campaign.findById(payment.campaignId);
      campaign.totalRaised += payment.amount;
      await campaign.save();

      // Send notifications
      await sendSMS(
        payment.phoneNumberUsed,
        `Payment successful! KES ${payment.amount} received for ${campaign.name}. Balance: KES ${pledge.remainingAmount}`
      );

      if (payment.memberId.email) {
        await sendEmail(
          payment.memberId.email,
          'Payment Confirmation',
          `Your payment of KES ${payment.amount} has been received. Thank you for your generosity!`
        );
      }

      await Notification.create({
        memberId: payment.memberId,
        paymentId: payment._id,
        type: 'payment-success',
        channel: 'sms',
        status: 'sent'
      });
    } else {
      // Payment failed
      payment.status = 'failed';
      payment.failureReason = result.ResultDesc;
      await payment.save();

      await sendSMS(
        payment.phoneNumberUsed,
        `Payment failed: ${result.ResultDesc}. Please try again or contact support.`
      );
    }

    await payment.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Callback error:', error);
    res.json({ success: false, error: error.message });
  }
});

// Record manual payment (admin only)
router.post('/manual-payment', authenticate, adminOnly, async (req, res) => {
  try {
    const { pledgeId, amount, mpesaRef, notes } = req.body;

    const pledge = await Pledge.findById(pledgeId);
    if (!pledge) {
      return res.status(404).json({ success: false, error: 'Pledge not found' });
    }

    const payment = new Payment({
      pledgeId,
      campaignId: pledge.campaignId,
      memberId: pledge.memberId,
      amount,
      paymentMethod: 'manual',
      mpesaRef,
      status: 'success',
      verifiedBy: req.user._id,
      verifiedAt: new Date(),
      completedAt: new Date()
    });

    await payment.save();

    pledge.paidAmount += amount;
    pledge.remainingAmount = pledge.pledgedAmount - pledge.paidAmount;
    if (pledge.remainingAmount === 0) {
      pledge.status = 'completed';
    } else if (pledge.paidAmount > 0) {
      pledge.status = 'partial';
    }
    await pledge.save();

    const campaign = await Campaign.findById(pledge.campaignId);
    campaign.totalRaised += amount;
    await campaign.save();

    res.json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get payment history (member)
router.get('/member/history', authenticate, async (req, res) => {
  try {
    const payments = await Payment.find({ memberId: req.user._id })
      .populate('pledgeId', 'campaignId pledgedAmount')
      .populate('campaignId', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all payments (admin only)
router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { status, campaignId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (campaignId) query.campaignId = campaignId;

    const payments = await Payment.find(query)
      .populate('memberId', 'name email')
      .populate('campaignId', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;