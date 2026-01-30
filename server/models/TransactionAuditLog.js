// server/models/TransactionAuditLog.js
const mongoose = require('mongoose');

const transactionAuditLogSchema = new mongoose.Schema({
  // Financial transaction reference
  transactionId: {
    type: String,
    required: true,
    index: true
  },

  transactionType: {
    type: String,
    enum: ['payment_initiated', 'payment_success', 'payment_failed', 'pledge_created', 'pledge_updated', 'contribution_recorded', 'contribution_verified', 'contribution'],
    required: true
  },

  // User context
  userId: {
    type: String,
    required: true,
    index: true
  },

  userEmail: String,
  userIpAddress: String,

  // Campaign context
  campaignId: String,
  pledgeId: String,
  paymentId: String,

  // Financial data
  amount: {
    type: Number,
    required: true
  },

  currency: {
    type: String,
    default: 'KES'
  },

  // Payment method
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'bank_transfer', 'cash', 'manual'],
    required: true
  },

  // M-Pesa specific
  mpesaCheckoutRequestId: String,
  mpesaReceiptNumber: String,
  mpesaPhoneNumber: String,

  // State before and after (for debugging/audit)
  beforeState: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  afterState: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'cancelled'],
    required: true
  },

  statusReason: String,

  // Idempotency tracking
  idempotencyKey: {
    type: String,
    sparse: true,
    index: true
  },

  // Request/Response tracking
  requestId: {
    type: String,
    sparse: true,
    index: true
  },

  // Action details
  action: {
    type: String,
    required: true
  },

  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Error tracking
  error: {
    type: String,
    default: null
  },

  errorCode: String,
  stackTrace: String,

  // Verification
  verifiedBy: String,
  verifiedAt: Date,

  // Timestamp - immutable after creation
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}, {
  // Prevent updates to audit log
  timestamps: false
});

// Compound indexes for common queries
transactionAuditLogSchema.index({ userId: 1, createdAt: -1 });
transactionAuditLogSchema.index({ campaignId: 1, transactionType: 1 });
transactionAuditLogSchema.index({ status: 1, createdAt: -1 });
transactionAuditLogSchema.index({ transactionId: 1, transactionType: 1 });

// Ensure audit log is never updated
transactionAuditLogSchema.pre('findByIdAndUpdate', function() {
  throw new Error('Audit logs cannot be modified');
});

transactionAuditLogSchema.pre('updateOne', function() {
  throw new Error('Audit logs cannot be modified');
});

transactionAuditLogSchema.pre('updateMany', function() {
  throw new Error('Audit logs cannot be modified');
});

/**
 * Helper method to log transaction
 */
transactionAuditLogSchema.statics.logTransaction = async function(data) {
  try {
    const log = new this({
      transactionId: data.transactionId || null,
      transactionType: data.transactionType,
      userId: data.userId,
      userEmail: data.userEmail || null,
      userIpAddress: data.userIpAddress || null,
      campaignId: data.campaignId || null,
      pledgeId: data.pledgeId || null,
      paymentId: data.paymentId || null,
      amount: data.amount,
      currency: data.currency || 'KES',
      paymentMethod: data.paymentMethod,
      mpesaCheckoutRequestId: data.mpesaCheckoutRequestId || null,
      mpesaReceiptNumber: data.mpesaReceiptNumber || null,
      mpesaPhoneNumber: data.mpesaPhoneNumber || null,
      beforeState: data.beforeState || {},
      afterState: data.afterState || {},
      status: data.status || 'pending',
      statusReason: data.statusReason || null,
      idempotencyKey: data.idempotencyKey || null,
      requestId: data.requestId || null,
      action: data.action,
      details: data.details || {},
      error: data.error || null,
      errorCode: data.errorCode || null,
      stackTrace: data.stackTrace || null,
      verifiedBy: data.verifiedBy || null,
      verifiedAt: data.verifiedAt || null
    });

    await log.save();
    return log;

  } catch (error) {
    console.error('[AUDIT-LOG] Failed to log transaction:', error);
    throw error;
  }
};

module.exports = mongoose.model('TransactionAuditLog', transactionAuditLogSchema);