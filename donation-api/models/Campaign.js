// ============================================
// FILE 4: models/Campaign.js (FIXED)
// ============================================
import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  goalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['pledge', 'offering', 'tithe', 'emergency', 'building', 'other'],
    default: 'pledge'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'archived', 'draft'],
    default: 'draft'
  },
  totalRaised: {
    type: Number,
    default: 0
  },
  totalPledged: {
    type: Number,
    default: 0
  },
  impactStatement: String,
  image: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Campaign', campaignSchema);