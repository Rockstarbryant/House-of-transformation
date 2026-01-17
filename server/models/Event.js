const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  date: {
    type: Date,
    required: true
  },
  time: String,
  location: String,
  image: String,
  // In your Event schema, update the registrations field:
// Update your registrations schema to this:

registrations: [
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false // Make optional for visitors
    },
    isVisitor: {
      type: Boolean,
      default: false
    },
    visitorName: {
      type: String,
      required: function() { return this.isVisitor; }
    },
    visitorEmail: {
      type: String,
      required: function() { return this.isVisitor; }
    },
    visitorPhone: {
      type: String
    },
    attendanceTime: {
      type: String
    },
    registeredAt: {
      type: Date,
      default: Date.now
    }
  }
],
  capacity: {
    type: Number,
    default: 100
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Event', eventSchema);