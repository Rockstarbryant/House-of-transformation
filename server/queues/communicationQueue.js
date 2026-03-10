// server/queues/communicationQueue.js
const { Queue } = require('bullmq');
const { getRedisConnection } = require('../config/redis'); // reuse shared connection

const QUEUE_NAME = 'communications';
let _queue;

const getQueue = function() {
  if (!_queue) {
    _queue = new Queue(QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts:         3,
        backoff:          { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail:     { count: 200 },
      },
    });
    _queue.on('error', function(err) {
      console.error('[CommunicationQueue] Queue error:', err.message);
    });
    console.log('[CommunicationQueue] ✓ Queue initialized');
  }
  return _queue;
};

const addCommunicationJob = async function(communicationId) {
  const queue = getQueue();
  const jobId  = 'comm-' + communicationId;
  const job    = await queue.add('send-communication', { communicationId: communicationId }, { jobId: jobId });
  console.log('[CommunicationQueue] ✅ Job queued: ' + jobId);
  return job;
};

const scheduleJob = async function(communicationId, delayMs) {
  const queue = getQueue();
  const jobId  = 'comm-sched-' + communicationId + '-' + Date.now();
  const job    = await queue.add(
    'send-communication',
    { communicationId: communicationId },
    { jobId: jobId, delay: delayMs }
  );
  console.log('[CommunicationQueue] ✅ Scheduled job: ' + jobId + ' (delay: ' + Math.round(delayMs / 1000) + 's)');
  return job;
};

const closeQueue = async function() {
  if (_queue) {
    await _queue.close();
    console.log('[CommunicationQueue] Queue closed');
  }
};

module.exports = { getQueue: getQueue, addCommunicationJob: addCommunicationJob, scheduleJob: scheduleJob, closeQueue: closeQueue };