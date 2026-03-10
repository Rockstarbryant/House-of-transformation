// server/queues/communicationQueue.js
const { Queue } = require('bullmq');
const { getRedisConnection } = require('../config/redis');

const QUEUE_NAME = 'communications';
let _queue;

const getQueue = () => {
  if (!_queue) {
    _queue = new Queue(QUEUE_NAME, {
      connection: getRedisConnection(), // ← was: redis
      defaultJobOptions: {
        attempts:         3,
        backoff:          { type: 'exponential', delay: 5_000 },
        removeOnComplete: { count: 100 },
        removeOnFail:     { count: 200 },
      },
    });
    _queue.on('error', err =>
      console.error('[CommunicationQueue] Queue error:', err.message)
    );
    console.log('[CommunicationQueue] ✓ Queue initialized');
  }
  return _queue;
};

/**
 * Queue a communication job for immediate processing.
 */
const addCommunicationJob = async (communicationId) => {
  const queue = getQueue();
  const jobId = `comm-${communicationId}`;
  const job   = await queue.add('send-communication', { communicationId }, { jobId });
  console.log(`[CommunicationQueue] ✅ Job queued: ${jobId}`);
  return job;
};

/**
 * Schedule a communication job for future processing.
 * @param {string} communicationId
 * @param {number} delayMs - milliseconds from now
 */
const scheduleJob = async (communicationId, delayMs) => {
  const queue = getQueue();
  const jobId = `comm-sched-${communicationId}-${Date.now()}`;
  const job   = await queue.add('send-communication', { communicationId }, { jobId, delay: delayMs });
  console.log(`[CommunicationQueue] ✅ Scheduled job: ${jobId} (delay: ${Math.round(delayMs / 1000)}s)`);
  return job;
};

const closeQueue = async () => {
  if (_queue) {
    await _queue.close();
    console.log('[CommunicationQueue] Queue closed');
  }
};

module.exports = { getQueue, addCommunicationJob, scheduleJob, closeQueue };