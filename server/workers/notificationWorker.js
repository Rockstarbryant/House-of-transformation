/**
 * Notification Worker — BullMQ consumer
 *
 * Processes jobs from the 'announcement-notifications' queue.
 *
 * Job names handled:
 *   'send-email' → processEmailNotification(announcementId)
 *   'send-sms'   → processSmsNotification(announcementId)
 *
 * Initialise by calling startNotificationWorker() from server.js.
 * The worker runs in the same Node.js process (suitable for Render single-dyno).
 * To separate it, move this file to its own entry point and connect it
 * to the same Redis and MongoDB instances.
 */

const { Worker } = require('bullmq');
const { getRedisConnection } = require('../config/redis');
const {
  processEmailNotification,
  processSmsNotification,
} = require('../services/notificationService');

const QUEUE_NAME = 'announcement-notifications';
let _worker = null;

const startNotificationWorker = () => {
  if (_worker) return _worker;

  _worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { announcementId } = job.data;
      console.log(`[Worker] ▶ Processing job "${job.name}" | id: ${job.id} | announcement: ${announcementId}`);

      switch (job.name) {
        case 'send-email': {
          const result = await processEmailNotification(announcementId);
          console.log(`[Worker] ✅ Email job complete:`, result);
          return result;
        }

        case 'send-sms': {
          const result = await processSmsNotification(announcementId);
          console.log(`[Worker] ✅ SMS job complete:`, result);
          return result;
        }

        default:
          throw new Error(`[Worker] Unknown job name: ${job.name}`);
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 2,         // Process 2 jobs simultaneously (email + SMS can overlap)
      limiter: {
        max:      10,          // Max 10 jobs processed per...
        duration: 60_000,      // ...per 60 seconds (Brevo rate limit protection)
      },
    }
  );

  // ── Event listeners ──────────────────────────────────────────────────
  _worker.on('completed', (job, result) => {
    console.log(`[Worker] ✅ Job completed: ${job.id} (${job.name})`);
  });

  _worker.on('failed', (job, err) => {
    console.error(
      `[Worker] ❌ Job failed: ${job?.id} (${job?.name}) | attempt ${job?.attemptsMade}/${job?.opts?.attempts}`,
      err.message
    );
    // On final failure (all retries exhausted), log for alerting
    if (job?.attemptsMade >= (job?.opts?.attempts || 3)) {
      console.error(
        `[Worker] 🚨 FINAL FAILURE — notification not delivered for announcement: ${job?.data?.announcementId}`
      );
    }
  });

  _worker.on('error', (err) => {
    console.error('[Worker] ❌ Worker error:', err.message);
  });

  _worker.on('stalled', (jobId) => {
    console.warn(`[Worker] ⚠️  Job stalled: ${jobId}`);
  });

  console.log(`[Worker] ✅ Notification worker started (queue: ${QUEUE_NAME})`);
  return _worker;
};

/**
 * Gracefully shut down the worker.
 * Call during process SIGTERM/SIGINT.
 */
const stopNotificationWorker = async () => {
  if (_worker) {
    await _worker.close();
    console.log('[Worker] Notification worker stopped');
  }
};

module.exports = { startNotificationWorker, stopNotificationWorker };