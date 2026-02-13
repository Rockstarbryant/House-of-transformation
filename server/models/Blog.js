const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true
  },
  // SEO ADDITION START
  slug: {
    type: String,
    unique: true,
    sparse: true, // Allow null values without unique constraint issues
    lowercase: true,
    index: true,
    trim: true
  },
  // SEO ADDITION END
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

// SEO ADDITION START: Auto-generate slug from title
blogSchema.pre('save', async function(next) {
  // Always update timestamp
  this.updatedAt = Date.now();
  
  // Generate slug if title changed and no slug exists
  if (this.isModified('title') && !this.slug) {
    const baseSlug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')      // Replace spaces with hyphens
      .replace(/-+/g, '-')       // Remove consecutive hyphens
      .substring(0, 60);         // Max 60 chars
    
    // Check for duplicates
    let slug = baseSlug;
    let counter = 1;
    
    // Use constructor to access the model
    while (await this.constructor.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  
  next();
});
// SEO ADDITION END

module.exports = mongoose.model('Blog', blogSchema);