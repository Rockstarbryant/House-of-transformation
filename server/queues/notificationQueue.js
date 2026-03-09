/**
 * Notification Queue — BullMQ producer
 *
 * Exposes two helper functions that controllers call:
 *   addEmailNotificationJob(announcementId)
 *   addSmsNotificationJob(announcementId)
 *
 * Separating them into distinct named jobs gives independent retry
 * behaviour — an SMS failure won't re-run the email send.
 */
const { Queue } = require('bullmq');
const { getRedisConnection } = require('../config/redis');

const QUEUE_NAME = 'announcement-notifications';

// Lazy-initialise so the queue is only created when first used.
let _queue = null;

const getQueue = () => {
  if (!_queue) {
    _queue = new Queue(QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,   // 5 s → 10 s → 20 s
        },
        removeOnComplete: { count: 100 },  // keep last 100 completed jobs
        removeOnFail:     { count: 200 },  // keep last 200 failed for inspection
      },
    });

    _queue.on('error', (err) =>
      console.error('[NotificationQueue] ❌ Queue error:', err.message)
    );
  }
  return _queue;
};

/**
 * Enqueue an email notification job for the given announcement.
 * @param {string} announcementId  - MongoDB ObjectId string
 */
const addEmailNotificationJob = async (announcementId) => {
  try {
    const job = await getQueue().add(
      'send-email',
      { announcementId },
      { jobId: `email-${announcementId}` }  // deduplicate: one email job per announcement
    );
    console.log(`[NotificationQueue] ✅ Email job queued: ${job.id}`);
    return job;
  } catch (err) {
    console.error('[NotificationQueue] ❌ Failed to enqueue email job:', err.message);
    // Don't throw — announcement was already saved; notification is non-critical
  }
};

/**
 * Enqueue an SMS notification job for the given announcement.
 * @param {string} announcementId  - MongoDB ObjectId string
 */
const addSmsNotificationJob = async (announcementId) => {
  try {
    const job = await getQueue().add(
      'send-sms',
      { announcementId },
      { jobId: `sms-${announcementId}` }
    );
    console.log(`[NotificationQueue] ✅ SMS job queued: ${job.id}`);
    return job;
  } catch (err) {
    console.error('[NotificationQueue] ❌ Failed to enqueue SMS job:', err.message);
  }
};

/**
 * Gracefully close the queue connection.
 * Call from process shutdown hooks.
 */
const closeQueue = async () => {
  if (_queue) {
    await _queue.close();
    console.log('[NotificationQueue] Queue closed');
  }
};

module.exports = { addEmailNotificationJob, addSmsNotificationJob, closeQueue };