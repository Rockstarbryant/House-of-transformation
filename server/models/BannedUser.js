const mongoose = require('mongoose');

/**
 * BannedUser Model
 * Tracks users who have been permanently banned from the system
 * Prevents re-registration with same email or IP address
 */
const bannedUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    index: true
  },
  
  supabase_uid: {
    type: String,
    sparse: true,
    index: true
  },
  
  name: {
    type: String,
    required: true
  },
  
  ipAddresses: [{
    type: String,
    trim: true
  }],
  
  reason: {
    type: String,
    required: [true, 'Ban reason is required']
  },
  
  bannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  bannedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Store original user data for reference
  originalUserData: {
    role: String,
    phone: String,
    location: String
  },
  
  // Optional: Allow unbanning
  unbannedAt: {
    type: Date,
    default: null
  },
  
  unbannedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  isActive: {
    type: Boolean,
    default: true // true means ban is active
  }
});

// Indexes for fast lookups
bannedUserSchema.index({ email: 1, isActive: 1 });
bannedUserSchema.index({ ipAddresses: 1, isActive: 1 });
bannedUserSchema.index({ bannedAt: -1 });

// Static method to check if email is banned
bannedUserSchema.statics.isEmailBanned = async function(email) {
  const banned = await this.findOne({ 
    email: email.toLowerCase(), 
    isActive: true 
  });
  return !!banned;
};

// Static method to check if IP is banned
bannedUserSchema.statics.isIPBanned = async function(ip) {
  const banned = await this.findOne({ 
    ipAddresses: ip, 
    isActive: true 
  });
  return !!banned;
};

// Static method to get ban details
bannedUserSchema.statics.getBanDetails = async function(email) {
  return await this.findOne({ 
    email: email.toLowerCase(), 
    isActive: true 
  }).populate('bannedBy', 'name email');
};

module.exports = mongoose.model('BannedUser', bannedUserSchema);