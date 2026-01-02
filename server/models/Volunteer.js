const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Personal Information
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  
  // Ministry Information
  ministry: {
    type: String,
    required: true,
    enum: [
      'Worship Team', 
      'Children\'s Ministry',
      'Ushering Team', 
      'Technical Team',
      'Community Outreach'
    ]
  },
  
  // Availability
  availability: {
    type: String,
    required: true
  },
  
  // Motivation (Required)
  motivation: {
    type: String,
    required: true,
    minlength: 20
  },
  
  // Optional Fields
  previousExperience: {
    type: String,
    default: ''
  },
  skills: {
    type: String,
    default: ''
  },
  
  // Application Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'interviewing'],
    default: 'pending'
  },
  
  // Admin Notes
  adminNotes: {
    type: String,
    default: ''
  },
  
  // Tracking
  appliedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // If approved
  startDate: {
    type: Date
  },
  hours: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
volunteerSchema.index({ user: 1, ministry: 1 });
volunteerSchema.index({ status: 1 });
volunteerSchema.index({ appliedAt: -1 });

module.exports = mongoose.model('Volunteer', volunteerSchema);