// server/models/ReceivedEmail.js
const mongoose = require('mongoose');

const receivedEmailSchema = new mongoose.Schema({
  // Sender Info
  from: {
    email: {
      type: String,
      required: true
    },
    name: String
  },
  
  // Content
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  
  // Category/Type
  category: {
    type: String,
    enum: ['feedback', 'inquiry', 'support', 'prayer-request', 'other'],
    default: 'other'
  },
  
  // Status
  status: {
    type: String,
    enum: ['unread', 'read', 'replied', 'archived'],
    default: 'unread'
  },
  
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Reply tracking
  repliedAt: Date,
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  replyMessage: String,
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Notes
  internalNotes: String,
  
  // Attachments
  attachments: [{
    filename: String,
    url: String,
    size: Number
  }]
}, {
  timestamps: true
});

// Indexes
receivedEmailSchema.index({ status: 1, createdAt: -1 });
receivedEmailSchema.index({ assignedTo: 1, status: 1 });
receivedEmailSchema.index({ category: 1 });

module.exports = mongoose.model('ReceivedEmail', receivedEmailSchema);