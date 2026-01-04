// ============================================
// FILE 6: models/Payment.js (FIXED)
// ============================================
// *** CREATE NEW FILE WITH THIS CONTENT ***

import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  pledgeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pledge',
    required: true
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'manual', 'bank-transfer', 'cash'],
    default: 'mpesa'
  },
  mpesaTransactionId: String,
  mpesaRef: String,
  mpesaReceiptNumber: String,
  phoneNumberUsed: String,
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'cancelled'],
    default: 'pending'
  },
  failureReason: String,
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  notificationSent: {
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false }
  }
});

export default mongoose.model('Payment', paymentSchema);