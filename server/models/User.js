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
  role: {
    type: String,
    enum: ['member', 'volunteer', 'usher', 'worship_team', 'pastor', 'bishop', 'admin'],
    default: 'member'
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
userSchema.pre('save', function(next) {
  if (!this.username && this.email) {
    this.username = this.email.split('@')[0] + Math.random().toString(36).substr(2, 9);
  }
  this.updatedAt = Date.now();
  next();
});

// Match password method NO LONGER NEEDED - DELETE
// Supabase handles password validation

// Hide sensitive fields
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password; // Keep for legacy, but won't exist
  return obj;
};

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ supabase_uid: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isActive: 1 });

module.exports = mongoose.model('User', userSchema);