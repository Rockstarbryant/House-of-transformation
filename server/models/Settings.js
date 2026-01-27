// server/models/Settings.js
const mongoose = require('mongoose');

/**
 * Settings Model
 * Stores all system-wide configuration settings
 * Uses key-value pairs with categories for organization
 */
const settingsSchema = new mongoose.Schema({
  // General Settings
  siteName: {
    type: String,
    default: 'House of Transformation'
  },
  siteTagline: {
    type: String,
    default: 'Mombasa County, Kenya'
  },
  siteDescription: {
    type: String,
    default: 'Welcome to House of Transformation Church'
  },
  contactEmail: {
    type: String,
    default: 'info@houseoftransformation.org'
  },
  contactPhone: {
    type: String,
    default: '+254 XXX XXX XXX'
  },
  contactAddress: {
    type: String,
    default: 'Mombasa, Kenya'
  },

  // Email Settings
  emailSettings: {
    smtpHost: { type: String, default: '' },
    smtpPort: { type: Number, default: 587 },
    smtpUser: { type: String, default: '' },
    smtpPassword: { type: String, default: '' },
    fromEmail: { type: String, default: '' },
    fromName: { type: String, default: 'House of Transformation' }
  },

  // Notification Settings
  notificationSettings: {
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: true },
    notifyOnNewUser: { type: Boolean, default: true },
    notifyOnNewDonation: { type: Boolean, default: true },
    notifyOnNewVolunteer: { type: Boolean, default: true }
  },

  // Security Settings
  securitySettings: {
    sessionTimeout: { type: Number, default: 60 }, // minutes
    passwordMinLength: { type: Number, default: 8 },
    requireSpecialChars: { type: Boolean, default: true },
    requireNumbers: { type: Boolean, default: true },
    requireUppercase: { type: Boolean, default: true },
    maxLoginAttempts: { type: Number, default: 5 },
    lockoutDuration: { type: Number, default: 15 } // minutes
  },

// Payment/Donation Settings
paymentSettings: {
  enablePayments: { type: Boolean, default: true },
  paymentGateway: { 
    type: String, 
    enum: ['mpesa', 'stripe', 'paypal', 'flutterwave'], 
    default: 'mpesa' 
  },
  minimumDonation: { type: Number, default: 100 },
  currency: { type: String, default: 'KES' },
  
  // M-Pesa Configuration
  mpesa: {
  enabled: { type: Boolean, default: true },
  consumerKey: { type: String, default: '' },
  consumerSecret: { type: String, default: '' },
  shortcode: { type: String, default: '' },
  passkey: { type: String, default: '' },
  environment: { 
    type: String, 
    enum: ['sandbox', 'production'],
    default: 'sandbox'
  },
  callbackUrl: { type: String, default: '' },
  timeout: { type: Number, default: 1000 },
  
  // NEW FIELDS FOR PAYMENT PROCESSING
  partyA: { type: String, default: '' }, // Phone number initiating request
  partyB: { type: String, default: '' }, // Business shortcode receiving funds
  transactionType: { 
    type: String,
    enum: ['CustomerPayBillOnline', 'CustomerBuyGoodsOnline'],
    default: 'CustomerPayBillOnline'
  },
  transactionDesc: { type: String, default: 'Church Donation' },
  accountRef: { type: String, default: 'HOT-DONATION' },
  amount: { type: Number, default: 0 },
  
  // SECURITY
  timestamp: { type: String, default: '' }, // Generated on request
  password: { type: String, default: '' } // Base64(shortcode+passkey+timestamp)
},
  
  // Stripe Configuration
  stripe: {
    enabled: { type: Boolean, default: false },
    publicKey: { type: String, default: '' },
    secretKey: { type: String, default: '' }
  },
  
  // PayPal Configuration
  paypal: {
    enabled: { type: Boolean, default: false },
    clientId: { type: String, default: '' },
    clientSecret: { type: String, default: '' },
    mode: {
      type: String,
      enum: ['sandbox', 'live'],
      default: 'sandbox'
    }
  },
  
  // Flutterwave Configuration
  flutterwave: {
    enabled: { type: Boolean, default: false },
    publicKey: { type: String, default: '' },
    secretKey: { type: String, default: '' },
    encryptionKey: { type: String, default: '' }
  }
},

// Donation Feature Settings
donationSettings: {
  enableDonations: { type: Boolean, default: true },
  enableCampaigns: { type: Boolean, default: true },
  enablePledges: { type: Boolean, default: true },
  enableOfferings: { type: Boolean, default: true },
  
  // Offering Types (as nested objects)
  offeringTypes: {
    tithe: {
      enabled: { type: Boolean, default: true },
      label: { type: String, default: 'Tithe' }
    },
    thanksgiving: {
      enabled: { type: Boolean, default: true },
      label: { type: String, default: 'Thanksgiving' }
    },
    firstFruit: {
      enabled: { type: Boolean, default: true },
      label: { type: String, default: 'First Fruit' }
    },
    seed: {
      enabled: { type: Boolean, default: true },
      label: { type: String, default: 'Seed Offering' }
    },
    general: {
      enabled: { type: Boolean, default: true },
      label: { type: String, default: 'General Offering' }
    }
  },
  
  // Receipt Settings
  sendReceipts: { type: Boolean, default: true },
  receiptEmail: { type: String, default: '' },
  includeAnnualStatement: { type: Boolean, default: true },
  
  // Notification Settings
  notifyAdminOnDonation: { type: Boolean, default: true },
  notifyDonorOnSuccess: { type: Boolean, default: true },
  adminNotificationEmail: { type: String, default: '' },
  
  // Pledge Settings
  pledgeReminderDays: { type: Number, default: 3 },
  enablePledgeReminders: { type: Boolean, default: true }
},

// ... rest of existing settings ...

  // Social Media Links
  socialMedia: {
    facebook: { type: String, default: '' },
    twitter: { type: String, default: '' },
    instagram: { type: String, default: '' },
    youtube: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    whatsapp: { type: String, default: '' }
  },

  // Livestream Settings
  livestreamSettings: {
    platform: { 
      type: String, 
      enum: ['youtube', 'facebook', 'custom'], 
      default: 'youtube' 
    },
    youtubeChannelId: { type: String, default: '' },
    facebookPageId: { type: String, default: '' },
    customStreamUrl: { type: String, default: '' },
    enableChat: { type: Boolean, default: true },
    autoStartLivestream: { type: Boolean, default: false }
  },

  // Maintenance Mode
  maintenanceMode: {
    enabled: { type: Boolean, default: false },
    message: { 
      type: String, 
      default: 'We are currently performing maintenance. Please check back soon.' 
    },
    allowedIPs: [{ type: String }],
    estimatedTime: { type: String, default: '' }
  },

  // API Keys (Third-party services)
  apiKeys: {
    googleMapsKey: { type: String, default: '' },
    cloudinaryKey: { type: String, default: '' },
    cloudinarySecret: { type: String, default: '' },
    supabaseUrl: { type: String, default: '' },
    supabaseKey: { type: String, default: '' },
    sendgridKey: { type: String, default: '' },
    twilioSid: { type: String, default: '' },
    twilioToken: { type: String, default: '' }
  },

  // SEO Settings
  seoSettings: {
    metaTitle: { type: String, default: 'House of Transformation' },
    metaDescription: { 
      type: String, 
      default: 'House of Transformation Church - Mombasa, Kenya' 
    },
    metaKeywords: { 
      type: String, 
      default: 'church, mombasa, kenya, transformation, worship' 
    },
    googleAnalyticsId: { type: String, default: '' },
    facebookPixelId: { type: String, default: '' }
  },

  // Feature Flags
  features: {
    enableBlog: { type: Boolean, default: true },
    enableEvents: { type: Boolean, default: true },
    enableSermons: { type: Boolean, default: true },
    enableGallery: { type: Boolean, default: true },
    enableDonations: { type: Boolean, default: true },
    enableVolunteers: { type: Boolean, default: true },
    enableTestimonies: { type: Boolean, default: true },
    enableLivestream: { type: Boolean, default: true }
  },

  // Metadata
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Singleton pattern - only one settings document
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  
  // If no settings exist, create default settings
  if (!settings) {
    settings = await this.create({});
  }
  
  return settings;
};

// Update timestamp before save
settingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
settingsSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Settings', settingsSchema);