const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    required: [true, 'Please provide a role name'],
    lowercase: true,
    trim: true,
    index: true
  },
  
  description: {
    type: String,
    default: null
  },

  permissions: [{
    type: String,
    enum: [
      // ===== BROAD PERMISSIONS (backward compatibility) =====
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
      'manage:settings',
      
      // ===== GRANULAR FEEDBACK PERMISSIONS =====
      // Read permissions (by category)
      'read:feedback:sermon',
      'read:feedback:service',
      'read:feedback:testimony',
      'read:feedback:suggestion',
      'read:feedback:prayer',
      'read:feedback:general',
      
      // Respond permissions (by category)
      'respond:feedback:sermon',
      'respond:feedback:service',
      'respond:feedback:testimony',
      'respond:feedback:suggestion',
      'respond:feedback:prayer',
      'respond:feedback:general',
      
      // Publish permission (testimony only)
      'publish:feedback:testimony',
      
      // Archive permissions (by category)
      'archive:feedback:sermon',
      'archive:feedback:service',
      'archive:feedback:testimony',
      'archive:feedback:suggestion',
      'archive:feedback:prayer',
      'archive:feedback:general',
      
      // Stats permission
      'view:feedback:stats',
      
      // ===== OTHER PERMISSIONS =====
      'view:analytics',
      'view:audit_logs'
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