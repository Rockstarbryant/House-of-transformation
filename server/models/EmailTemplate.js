// server/models/EmailTemplate.js
const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  description: {
    type: String,
    trim: true
  },
  
  subject: {
    type: String,
    required: true
  },
  
  message: {
    type: String,
    required: true
  },
  
  category: {
    type: String,
    enum: ['announcement', 'event', 'newsletter', 'reminder', 'welcome', 'other'],
    default: 'other'
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  usageCount: {
    type: Number,
    default: 0
  },
  
  lastUsedAt: Date
}, {
  timestamps: true
});

// Index for faster queries
emailTemplateSchema.index({ isActive: 1, category: 1 });
emailTemplateSchema.index({ createdBy: 1 });

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);