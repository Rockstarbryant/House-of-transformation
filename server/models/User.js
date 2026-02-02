const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  supabase_uid: {
    type: String,
    unique: true,
    sparse: true,
    required: [true, 'Supabase UID is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  phone: {
    type: String,
    sparse: true
  },
  location: String,
  bio: String,
  avatar: {
    type: String,
    default: null
  },
  
  // ===== NEW: Gender field =====
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: false
  },
  
  // ===== CHANGED FROM STRING ENUM TO ROLE REFERENCE =====
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    sparse: true,
    // Default will be set to 'member' role ID in pre-save hook or on signup
  },
  
  ministries: [{
    type: String
  }],
  
  blogsCreated: {
    type: Number,
    default: 0
  },
  testimonyCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // ===== NEW: Track if user is banned =====
  isBanned: {
    type: Boolean,
    default: false
  },
  bannedAt: {
    type: Date,
    default: null
  },
  bannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  banReason: {
    type: String,
    default: null
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

// Generate username from email if not provided
userSchema.pre('save', async function(next) {
  if (!this.username && this.email) {
    this.username = this.email.split('@')[0] + Math.random().toString(36).substr(2, 9);
  }
  this.updatedAt = Date.now();
  
  // Set default role to 'member' if not assigned
  if (!this.role) {
    try {
      const Role = require('./Role');
      const memberRole = await Role.findOne({ name: 'member' });
      if (memberRole) {
        this.role = memberRole._id;
      }
    } catch (error) {
      console.warn('[USER-MODEL] Could not set default member role:', error.message);
    }
  }
  
  next();
});

// Hide sensitive fields
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ supabase_uid: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isActive: 1 });
userSchema.index({ isBanned: 1 });

module.exports = mongoose.model('User', userSchema);