// server/models/Campaign.js
const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Campaign title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },

  description: {
    type: String,
    required: [true, 'Campaign description is required'],
    trim: true
  },

  goalAmount: {
    type: Number,
    required: [true, 'Goal amount is required'],
    min: [0, 'Goal amount must be positive']
  },

  currentAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  campaignType: {
    type: String,
    enum: {
      values: ['building', 'mission', 'event', 'equipment', 'benevolence', 'offering'],
      message: 'Campaign type must be one of: building, mission, event, equipment, benevolence, offering'
    },
    required: true
  },

  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    validate: {
      validator: function(v) {
        return v <= this.endDate;
      },
      message: 'Start date must be before end date'
    }
  },

  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },

  status: {
    type: String,
    enum: {
      values: ['draft', 'active', 'completed', 'archived'],
      message: 'Status must be one of: draft, active, completed, archived'
    },
    default: 'draft'
  },

  visibility: {
    type: String,
    enum: {
      values: ['public', 'members-only'],
      message: 'Visibility must be public or members-only'
    },
    default: 'public'
  },

  allowPledges: {
    type: Boolean,
    default: true
  },

  isFeatured: {
    type: Boolean,
    default: false
  },

  imageUrl: {
    type: String,
    default: null
  },

  // In campaignSchema, add after imageUrl:
supabaseId: {
  type: String,
  unique: true,
  sparse: true // Allows null values while maintaining uniqueness
},

  impactStatement: {
    type: String,
    trim: true
  },

  milestones: [{
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    description: String,
    achieved: {
      type: Boolean,
      default: false
    },
    achievedDate: Date
  }],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Index for faster queries
campaignSchema.index({ status: 1 });
campaignSchema.index({ campaignType: 1 });
campaignSchema.index({ createdAt: -1 });
campaignSchema.index({ isFeatured: 1, status: 1 });

// Update updatedAt before save
campaignSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Campaign', campaignSchema);