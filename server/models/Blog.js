const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Please add content']
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  authorRole: {
    type: String,
    enum: ['member', 'volunteer', 'usher', 'worship_team', 'pastor', 'bishop', 'admin'],
    required: true
  },
  category: {
    type: String,
    enum: ['testimonies', 'events', 'teaching', 'news'],
    required: [true, 'Please select a category']
  },
  description: String,
  image: String,
  approved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  likes: [{
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    text: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
blogSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Blog', blogSchema);