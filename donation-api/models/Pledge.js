// ============================================
// FILE 5: models/Pledge.js (FIXED)
// ============================================
// *** CREATE NEW FILE WITH THIS CONTENT ***

import mongoose from 'mongoose';

const pledgeSchema = new mongoose.Schema({
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
  memberName: {
    type: String,
    required: true
  },
  memberPhone: {
    type: String,
    required: true
  },
  memberEmail: String,
  pledgedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    default: function() {
      return this.pledgedAmount - this.paidAmount;
    }
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'completed', 'overdue'],
    default: 'pending'
  },
  installmentPlan: {
    type: String,
    enum: ['lump-sum', 'weekly', 'bi-weekly', 'monthly'],
    default: 'lump-sum'
  },
  nextPaymentDue: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  dueDate: Date,
  notes: String
});

export default mongoose.model('Pledge', pledgeSchema);