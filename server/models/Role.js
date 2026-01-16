const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: [true, 'Please provide a role name'],
    lowercase: true,
    trim: true,
    enum: ['admin', 'bishop', 'pastor', 'volunteer', 'usher', 'worship_team', 'member'],
    index: true
  },
  
  description: {
    type: String,
    default: null
  },

  permissions: [{
    type: String,
    enum: [
      'manage:events',
      'manage:sermons',
      'manage:gallery',
      'manage:donations',
      'manage:users',
      'manage:roles',
      'manage:blog',
      'manage:livestream',
      'manage:feedback',
      'manage:volunteers',
      'view:analytics',
      'view:audit_logs',
      'manage:settings'
    ]
  }],

  isSystemRole: {
    type: Boolean,
    default: false,
    description: 'System roles (admin, member) cannot be deleted'
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

// Prevent modification of system roles
roleSchema.pre('findByIdAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update && update.$set) {
    // Check if trying to modify system role
    if (update.$set.name) {
      next(new Error('Cannot modify system role name'));
    }
  }
  next();
});

// Update timestamp before save
roleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
roleSchema.index({ name: 1 }, { unique: true });
roleSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Role', roleSchema);