// ============================================
// FILE 7: models/Notification.js (FIXED)
// ============================================
// *** CREATE NEW FILE WITH THIS CONTENT ***

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  type: {
    type: String,
    enum: ['payment-success', 'payment-failed', 'pledge-reminder', 'campaign-end', 'campaign-start'],
    required: true
  },
  channel: {
    type: String,
    enum: ['email', 'sms', 'whatsapp'],
    required: true
  },
  message: String,
  recipientPhone: String,
  recipientEmail: String,
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  sentAt: Date,
  failureReason: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Notification', notificationSchema);