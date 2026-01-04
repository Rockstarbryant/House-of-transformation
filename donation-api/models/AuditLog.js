// ============================================
// FILE 8: models/AuditLog.js (FIXED)
// ============================================
// *** CREATE NEW FILE WITH THIS CONTENT ***

import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  action: {
    type: String,
    required: true
  },
  resource: {
    type: String,
    enum: ['pledge', 'payment', 'campaign', 'notification', 'user'],
    required: true
  },
  resourceId: mongoose.Schema.Types.ObjectId,
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('AuditLog', auditLogSchema);