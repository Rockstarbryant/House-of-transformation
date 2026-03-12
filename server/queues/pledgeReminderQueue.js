const { Queue } = require('bullmq');
const { getRedisConnection } = require('../config/redis');

const QUEUE_NAME = 'pledge-reminders';
let _queue;

const getQueue = function() {
  if (!_queue) {
    _queue = new Queue(QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: { count: 50 }, removeOnFail: { count: 100 } }
    });
    _queue.on('error', function(err) { console.error('[PledgeReminderQueue] Error:', err.message); });
  }
  return _queue;
};

// Called by the cron scheduler every morning
const addScheduledRun  = async function() { return getQueue().add('scheduled-run',  { forceAll: false }, {}); };

// Called by admin blast endpoint
const addAdminBlastRun = async function() { return getQueue().add('admin-blast',    { forceAll: true  }, {}); };

const closeQueue = async function() { if (_queue) { await _queue.close(); } };

module.exports = { getQueue, addScheduledRun, addAdminBlastRun, closeQueue };