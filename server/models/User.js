const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
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
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
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
  
  // ===== EMAIL VERIFICATION FIELDS =====
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpiry: {
    type: Date,
    default: null
  },
  
  // ===== PASSWORD RESET FIELDS =====
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpiry: {
    type: Date,
    default: null
  },
  
  // Engagement metrics
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

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Generate username from email if not provided
userSchema.pre('save', function(next) {
  if (!this.username && this.email) {
    this.username = this.email.split('@')[0] + Math.random().toString(36).substr(2, 9);
  }
  this.updatedAt = Date.now();
  next();
});

// Match password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  // Generate token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Hash and save token
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Set expiry to 24 hours
  this.emailVerificationExpiry = Date.now() + 24 * 60 * 60 * 1000;
  
  return token;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  // Generate token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Hash and save token
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Set expiry to 30 minutes
  this.passwordResetExpiry = Date.now() + 30 * 60 * 1000;
  
  return token;
};

// Hide sensitive fields
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.passwordResetToken;
  return obj;
};

// Indexes for better query performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isActive: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });

module.exports = mongoose.model('User', userSchema);