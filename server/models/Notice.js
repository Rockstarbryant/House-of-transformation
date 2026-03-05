const mongoose = require('mongoose');

const NoticeSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: [true, 'Notice message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters']
    },
    style: {
      type: String,
      enum: ['sticky', 'marquee', 'static'],
      default: 'static'
    },
    backgroundColor: {
      type: String,
      default: '#8B1A1A'
    },
    textColor: {
      type: String,
      default: '#FFFFFF'
    },
    active: {
      type: Boolean,
      default: false
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    dismissible: {
      type: Boolean,
      default: true
    },
    linkUrl: {
      type: String,
      default: null,
      trim: true
    },
    linkLabel: {
      type: String,
      default: null,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient active notice queries
NoticeSchema.index({ active: 1, priority: -1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Notice', NoticeSchema);