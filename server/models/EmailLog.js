// server/models/EmailLog.js
const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  // Sender Info
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Recipient Info
  recipients: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    email: String,
    name: String,
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'pending'
    },
    error: String,
    deliveredAt: Date
  }],
  
  // Email Content
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  htmlContent: String,
  
  // Email Type
  type: {
    type: String,
    enum: ['single', 'bulk', 'all', 'role-based', 'scheduled'],
    default: 'single'
  },
  
  // For role-based emails
  targetRole: String,
  
  // Statistics
  totalRecipients: {
    type: Number,
    default: 0
  },
  successCount: {
    type: Number,
    default: 0
  },
  failedCount: {
    type: Number,
    default: 0
  },
  
  // Scheduling
  scheduledFor: Date,
  sentAt: Date,
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'failed'],
    default: 'draft'
  },
  
  // Attachments
  attachments: [{
    filename: String,
    url: String,
    size: Number
  }],
  
  // Template reference
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailTemplate'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
emailLogSchema.index({ sentBy: 1, createdAt: -1 });
emailLogSchema.index({ status: 1, scheduledFor: 1 });
emailLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);