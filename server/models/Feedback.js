const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  // Category (Required)
  category: {
    type: String,
    required: true,
    enum: ['sermon', 'service', 'testimony', 'suggestion', 'prayer', 'general']
  },
  
  // User Info (ALL OPTIONAL - supports anonymous feedback)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  name: {
    type: String,
    trim: true,
    default: null
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: null
  },
  phone: {
    type: String,
    trim: true,
    default: null
  },
  
  // Anonymous & Privacy Settings
  isAnonymous: {
    type: Boolean,
    default: false
  },
  isFirstTimeVisitor: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  allowFollowUp: {
    type: Boolean,
    default: false
  },
  shareOnPrayerList: {
    type: Boolean,
    default: false
  },
  
  // Flexible data structure for different feedback types
  feedbackData: {
    // Sermon Feedback Fields
    sermonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sermon'
    },
    sermonTitle: String,
    sermonDate: Date,
    rating: Number, // 1-5
    resonatedMost: String,
    application: String,
    questions: String,
    wouldRecommend: Boolean,
    
    // Service Experience Fields
    ratings: {
      overall: Number,
      worship: Number,
      hospitality: Number,
      facility: Number,
      parking: Number,
      childrensMinistry: Number,
      soundQuality: Number
    },
    whatWentWell: String,
    improvements: String,
    wouldReturn: String, // Yes/Maybe/No
    
    // Testimony Fields
    testimonyType: String,
    title: String,
    story: String,
    testimonyDate: Date,
    media: [String], // URLs to uploaded files
    shareInService: Boolean,
    
    // Suggestion Fields
    suggestionType: String,
    suggestionTitle: String,
    description: String,
    importance: String,
    benefit: String,
    priority: String, // Low/Medium/High
    willingToHelp: Boolean,
    
    // Prayer Request Fields
    prayerCategory: String,
    request: String,
    urgency: String, // Urgent/Regular
    prayerNeeded: Boolean,
    preferredContact: String,
    
    // General Feedback Fields
    feedbackType: String, // Compliment/Question/Concern/Comment
    subject: String,
    message: String
  },
  
  // Admin & Review
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'published', 'archived', 'responded'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  adminNotes: String,
  response: String,
  responseSentAt: Date,
  
  // Submission metadata
  submittedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: String, // For spam prevention only
  userAgent: String
}, {
  timestamps: true
});

// Indexes for better query performance
feedbackSchema.index({ category: 1, status: 1 });
feedbackSchema.index({ submittedAt: -1 });
feedbackSchema.index({ user: 1 });
feedbackSchema.index({ isAnonymous: 1 });

// Virtual for response time
feedbackSchema.virtual('responseTime').get(function() {
  if (this.responseSentAt && this.submittedAt) {
    return Math.floor((this.responseSentAt - this.submittedAt) / (1000 * 60 * 60)); // hours
  }
  return null;
});

// Method to check if feedback can be published
feedbackSchema.methods.canPublish = function() {
  return this.category === 'testimony' && 
         (this.isPublic || this.feedbackData.shareInService) &&
         this.status === 'reviewed';
};

// Static method to get statistics
feedbackSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $facet: {
        total: [{ $count: 'count' }],
        byCategory: [
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ],
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        anonymous: [
          { $match: { isAnonymous: true } },
          { $count: 'count' }
        ],
        thisWeek: [
          {
            $match: {
              submittedAt: {
                $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              }
            }
          },
          { $count: 'count' }
        ]
      }
    }
  ]);
  
  return {
    total: stats[0].total[0]?.count || 0,
    byCategory: stats[0].byCategory,
    byStatus: stats[0].byStatus,
    anonymous: stats[0].anonymous[0]?.count || 0,
    thisWeek: stats[0].thisWeek[0]?.count || 0
  };
};

module.exports = mongoose.model('Feedback', feedbackSchema);