const mongoose = require('mongoose');

const livestreamSchema = new mongoose.Schema({
  // Basic Info
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['sermon', 'praise_worship', 'full_service', 'sunday_school', 'special_event'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },

  // Stream URLs
  youtubeUrl: String,
  facebookUrl: String,
  youtubeVideoId: String,
  facebookVideoId: String,

  // Status & Timing
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'archived'],
    default: 'scheduled'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: Date,
  duration: Number, // in seconds

  // Metadata
  preachers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  preacherNames: [String], // Fallback if not in system
  scriptures: [String], // Bible references (e.g., "John 3:16")
  tags: [String],
  thumbnail: String, // Cloudinary URL

  // Analytics
  viewCount: {
    type: Number,
    default: 0
  },
  peakConcurrentViewers: {
    type: Number,
    default: 0
  },
  avgWatchDuration: Number, // in seconds
  engagementScore: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },

  // AI Features
  aiSummary: {
  summary: String,
  keyPoints: [String],
  captions: [
    {
      timestamp: String,    // "00:05"
      speaker: String,       // "Speaker 1"
      text: String          // "What they said"
    }
  ],
  speakerNotes: {},        // { "Speaker 1": "Summary...", ... }
  generatedAt: Date,
  aiModel: String
},

  // Transcript Management
  transcript: {
    raw: {
      type: String,          // Auto-extracted from YouTube/Facebook
      default: null
    },
    cleaned: {
      type: String,          // Admin-edited version
      default: null
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastUpdatedAt: Date,
    extractionAttempted: {
      type: Boolean,
      default: false
    },
    extractionStatus: {
      type: String,
      enum: ['pending', 'success', 'failed', 'manual'],
      default: 'pending'
    },
    extractionError: String  // Error message if extraction failed
  },

  // Archive Info
  archivedAt: Date,
  archiveUrl: String, // Link to archived video
  isPublic: {
    type: Boolean,
    default: true
  },

  // System Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });



// Index for faster queries
livestreamSchema.index({ status: 1, startTime: -1 });
livestreamSchema.index({ type: 1, startTime: -1 });
livestreamSchema.index({ preachers: 1 });
livestreamSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Livestream', livestreamSchema);