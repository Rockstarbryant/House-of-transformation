// server/models/Communication.js
const mongoose = require('mongoose');

const communicationSchema = new mongoose.Schema(
  {
    // Content
    subject:     { type: String, trim: true },      // required for email channel
    message:     { type: String, required: true },
    htmlContent: { type: String },

    // Channels — at least one required
    channels: {
      type:     [String],
      enum:     ['email', 'sms'],
      required: true,
      validate: { validator: v => v.length > 0, message: 'At least one channel is required' },
    },

    // Recipient targeting
    recipientType: {
      type:     String,
      enum:     ['all', 'bulk', 'single', 'role'],
      required: true,
    },
    targetRoles:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    targetUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Template reference (optional)
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },

    // Creator
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Lifecycle status
    status: {
      type:    String,
      enum:    ['queued', 'sending', 'sent', 'partial', 'failed', 'scheduled'],
      default: 'queued',
    },

    // BullMQ job reference
    jobId: { type: String },

    // Aggregate delivery stats
    totalRecipients:  { type: Number, default: 0 },
    emailSuccessCount:{ type: Number, default: 0 },
    emailFailedCount: { type: Number, default: 0 },
    smsSuccessCount:  { type: Number, default: 0 },
    smsFailedCount:   { type: Number, default: 0 },

    // Timing
    scheduledFor: { type: Date },
    sentAt:       { type: Date },

    // Error capture
    errorMessage: { type: String },
  },
  { timestamps: true }
);

// Efficient query patterns
communicationSchema.index({ createdBy: 1, createdAt: -1 });
communicationSchema.index({ status: 1, scheduledFor: 1 });
communicationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Communication', communicationSchema);