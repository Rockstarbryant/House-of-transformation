const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  publicId: String,
  position: Number
}, { _id: false });

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
    maxlength: [10000, 'Description cannot be more than 10000 characters']
  },
  // TipTap stores content as HTML
  descriptionHtml: {
    type: String,
    default: null
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
  thumbnailPublicId: {
    type: String,
    default: null
  },
  // Images embedded in TipTap content
  images: {
    type: [imageSchema],
    default: [],
    validate: {
      validator: function(v) {
        return v.length <= 10; // More images since they're embedded
      },
      message: 'Maximum 10 images allowed'
    }
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
  
  // Pin feature
  pinned: {
    type: Boolean,
    default: false
  },
  pinnedOrder: {
    type: Number,
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
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
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