const { Worker } = require('bullmq');
const { getRedisConnection } = require('../config/redis');

let worker;

const startPledgeReminderWorker = function() {
  worker = new Worker(
    'pledge-reminders',
    async function(job) {
      console.log('[PledgeReminderWorker] Running job:', job.name);
      const service = require('../services/pledgeReminderService');
      const result  = await service.processPledgeReminders({ forceAll: job.data.forceAll });
      console.log('[PledgeReminderWorker] Result:', result);
    },
    { connection: getRedisConnection(), concurrency: 1 }
  );

  worker.on('failed', function(job, err) {
    console.error('[PledgeReminderWorker] Job failed:', job && job.id, err.message);
  });

  console.log('[PledgeReminderWorker] Started');
  return worker;
};

const stopPledgeReminderWorker = async function() {
  if (worker) await worker.close();
};

module.exports = { startPledgeReminderWorker, stopPledgeReminderWorker };