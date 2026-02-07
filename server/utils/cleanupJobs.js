// server/utils/cleanupJobs.js - ✅ AUTO-MARK TIMEOUT TRANSACTIONS
const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY
);

/**
 * Mark M-Pesa payments that have timed out (no callback after 5 minutes)
 * Run this every 5 minutes via cron or setInterval
 */
async function markTimeoutTransactions() {
  try {
    console.log('[CLEANUP] Checking for timeout transactions...');
    
    // M-Pesa STK Push timeout is typically 45 seconds
    // We give 5 minutes to be safe (in case of delays)
    const timeoutThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    // Update contributions
    const { data: timedOutContributions, error: contribError } = await supabase
      .from('contributions')
      .update({ 
        status: 'failed',
        notes: 'Payment timeout - no M-Pesa callback received within 5 minutes'
      })
      .eq('payment_method', 'mpesa')
      .eq('status', 'pending')
      .lt('created_at', timeoutThreshold)
      .select();
    
    if (timedOutContributions && timedOutContributions.length > 0) {
      console.log(`[CLEANUP] Marked ${timedOutContributions.length} contributions as failed due to timeout`);
      
      // Log each timeout
      const TransactionAuditLog = require('../models/TransactionAuditLog');
      for (const contrib of timedOutContributions) {
        await TransactionAuditLog.create({
          transactionType: 'contribution',
          transactionId: contrib.id,
          userId: 'system',
          action: 'contribution_timeout',
          amount: contrib.amount,
          paymentMethod: 'mpesa',
          status: 'failed',
          metadata: {
            reason: 'M-Pesa callback not received within 5 minutes',
            originalCreatedAt: contrib.created_at
          }
        }).catch(err => console.error('[CLEANUP] Audit error:', err));
      }
    }
    
    // Also update payments (for pledges)
    const { data: timedOutPayments, error: paymentError } = await supabase
      .from('payments')
      .update({ 
        status: 'failed',
        notes: 'Payment timeout - no M-Pesa callback received within 5 minutes'
      })
      .eq('payment_method', 'mpesa')
      .eq('status', 'pending')
      .lt('created_at', timeoutThreshold)
      .select();
    
    if (timedOutPayments && timedOutPayments.length > 0) {
      console.log(`[CLEANUP] Marked ${timedOutPayments.length} payments as failed due to timeout`);
    }
    
    // Check for errors
    if (contribError) {
      console.error('[CLEANUP] Contribution update error:', contribError);
    }
    
    if (paymentError) {
      console.error('[CLEANUP] Payment update error:', paymentError);
    }
    
    const totalMarked = 
      (timedOutContributions?.length || 0) + 
      (timedOutPayments?.length || 0);
    
    if (totalMarked > 0) {
      console.log(`[CLEANUP] ✅ Total transactions marked as failed: ${totalMarked}`);
    } else {
      console.log('[CLEANUP] ✅ No timeout transactions found');
    }
    
  } catch (error) {
    console.error('[CLEANUP] Unexpected error:', error);
  }
}

/**
 * Clean up old idempotency keys (older than 24 hours)
 */
async function cleanupIdempotencyKeys() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('idempotency_keys')
      .delete()
      .lt('expires_at', twentyFourHoursAgo)
      .select();
    
    if (data && data.length > 0) {
      console.log(`[CLEANUP] Removed ${data.length} expired idempotency keys`);
    }
    
    if (error) {
      console.error('[CLEANUP] Idempotency cleanup error:', error);
    }
    
  } catch (error) {
    console.error('[CLEANUP] Idempotency cleanup unexpected error:', error);
  }
}

/**
 * Clean up old audit logs (older than 90 days)
 * This keeps the database lean
 */
async function cleanupOldAuditLogs() {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const TransactionAuditLog = require('../models/TransactionAuditLog');
    const result = await TransactionAuditLog.deleteMany({
      createdAt: { $lt: ninetyDaysAgo },
      // Don't delete critical actions
      action: { 
        $nin: [
          'contribution_verified',
          'payment_verified', 
          'mpesa_callback_received',
          'contribution_deleted',
          'payment_deleted'
        ] 
      }
    });
    
    if (result.deletedCount > 0) {
      console.log(`[CLEANUP] Removed ${result.deletedCount} old audit logs`);
    }
    
  } catch (error) {
    console.error('[CLEANUP] Audit log cleanup error:', error);
  }
}

/**
 * Initialize all cleanup jobs
 * Call this from server.js on startup
 */
function initializeCleanupJobs() {
  console.log('[CLEANUP] Initializing cleanup jobs...');
  
  // Run timeout check immediately on startup
  markTimeoutTransactions();
  
  // Then run every 5 minutes
  setInterval(markTimeoutTransactions, 5 * 60 * 1000);
  console.log('[CLEANUP] ✅ Timeout checker: Every 5 minutes');
  
  // Clean idempotency keys every 6 hours
  setInterval(cleanupIdempotencyKeys, 6 * 60 * 60 * 1000);
  console.log('[CLEANUP] ✅ Idempotency cleanup: Every 6 hours');
  
  // Clean old audit logs once per day at 3 AM
  const now = new Date();
  const millisTill3AM = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // tomorrow
    3, 0, 0, 0 // 3 AM
  ) - now;
  
  setTimeout(() => {
    cleanupOldAuditLogs();
    // Then run every 24 hours
    setInterval(cleanupOldAuditLogs, 24 * 60 * 60 * 1000);
  }, millisTill3AM);
  
  console.log('[CLEANUP] ✅ Audit log cleanup: Daily at 3 AM');
  
  console.log('[CLEANUP] All cleanup jobs initialized successfully!');
}

module.exports = {
  markTimeoutTransactions,
  cleanupIdempotencyKeys,
  cleanupOldAuditLogs,
  initializeCleanupJobs
};