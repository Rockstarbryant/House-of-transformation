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
    lowercase: true,
    index: true  // Index for faster lookups
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  
  // IP Address for additional security
  ipAddress: {
    type: String,
    required: true,
    index: true
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
    default: Date.now,
    index: true
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Edit Tracking
  editCount: {
    type: Number,
    default: 0
  },
  lastEditedAt: {
    type: Date
  },
  canEdit: {
    type: Boolean,
    default: true
  },
  editLockedAt: {
    type: Date  // Timestamp when editing was locked
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

// Indexes for faster queries
volunteerSchema.index({ user: 1 });
volunteerSchema.index({ email: 1 });
volunteerSchema.index({ ipAddress: 1 });
volunteerSchema.index({ status: 1 });
volunteerSchema.index({ appliedAt: -1 });
volunteerSchema.index({ email: 1, status: 1 });  // For checking active applications

// Middleware to check if application is editable
volunteerSchema.methods.isEditable = function() {
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
  
  // Can only edit if: within 3 hours AND haven't edited yet (editCount = 0)
  return this.appliedAt > threeHoursAgo && this.editCount === 0;
};

// Middleware to lock editing after 3 hours or after edit
volunteerSchema.methods.lockEditing = function() {
  this.canEdit = false;
  this.editCount += 1;
  this.lastEditedAt = new Date();
  this.editLockedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Volunteer', volunteerSchema);