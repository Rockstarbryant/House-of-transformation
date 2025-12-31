const mongoose = require('mongoose');

const sermonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a sermon title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  pastor: {
    type: String,
    required: [true, 'Please provide pastor name'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Please provide a sermon date']
  },
  category: {
    type: String,
    enum: {
      values: ['Sunday Service', 'Bible Study', 'Special Event', 'Youth Ministry', 'Prayer Meeting'],
      message: 'Please select a valid category'
    },
    default: 'Sunday Service'
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  // Media fields
  type: {
    type: String,
    enum: {
      values: ['text', 'photo', 'video'],
      message: 'Sermon type must be either text, photo, or video'
    },
    default: 'text'
  },
  thumbnail: {
    type: String,
    default: null
  },
  videoUrl: {
    type: String,
    default: null
  },
  audioUrl: {
    type: String,
    default: null
  },
  duration: {
    type: Number,
    default: null
  },
  // Engagement metrics
  views: {
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
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
sermonSchema.index({ date: -1 });
sermonSchema.index({ category: 1 });
sermonSchema.index({ type: 1 });
sermonSchema.index({ pastor: 1 });
sermonSchema.index({ title: 'text', description: 'text', pastor: 'text' });

// Pre-save middleware to update the updatedAt field
sermonSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Sermon', sermonSchema);