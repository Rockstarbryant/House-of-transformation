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

  // ✅ CORRECT: Array of strings with enum validation
  permissions: {
    type: [String],  // ← This is the correct syntax
    enum: [
      // ===== BROAD PERMISSIONS =====
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

      // ===== CAMPAIGN PERMISSIONS =====
      'view:campaigns',
      'create:campaigns',
      'edit:campaigns',
      'delete:campaigns',
      'activate:campaigns',
      'feature:campaigns',

      // ===== PLEDGE PERMISSIONS =====
      'view:pledges',
      'view:pledges:all',
      'approve:pledges',
      'edit:pledges',

      // ===== PAYMENT PERMISSIONS =====
      'view:payments',
      'view:payments:all',
      'process:payments',
      'verify:payments',

      // ===== DONATION REPORTS =====
      'view:donation:reports',
      
      // ===== FEEDBACK READ PERMISSIONS =====
      'read:feedback:sermon',
      'read:feedback:service',
      'read:feedback:testimony',
      'read:feedback:suggestion',
      'read:feedback:prayer',
      'read:feedback:general',
      
      // ===== FEEDBACK RESPOND PERMISSIONS =====
      'respond:feedback:sermon',
      'respond:feedback:service',
      'respond:feedback:testimony',
      'respond:feedback:suggestion',
      'respond:feedback:prayer',
      'respond:feedback:general',
      
      // ===== FEEDBACK SPECIAL PERMISSIONS =====
      'publish:feedback:testimony',
      
      // ===== FEEDBACK ARCHIVE PERMISSIONS =====
      'archive:feedback:sermon',
      'archive:feedback:service',
      'archive:feedback:testimony',
      'archive:feedback:suggestion',
      'archive:feedback:prayer',
      'archive:feedback:general',

       'manage:announcements', 
      
      // ===== FEEDBACK STATS =====
      'view:feedback:stats',
      
      // ===== OTHER PERMISSIONS =====
      'view:analytics',
      'view:audit_logs'
    ],
    default: []
  },

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
roleSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  if (update && update.$set) {
    if (update.$set.name) {
      return next(new Error('Cannot modify system role name'));
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