// server/workers/communicationWorker.js
const { Worker } = require('bullmq');
const { getRedisConnection } = require('../config/redis'); // reuse shared connection

let worker;

const startCommunicationWorker = () => {
  if (!process.env.BREVO_API_KEY) {
    console.warn('[CommunicationWorker] ⚠ BREVO_API_KEY not set — emails will be skipped');
  }

  worker = new Worker(
    'communications',
    async (job) => {
      const { communicationId } = job.data;
      console.log(
        '[CommunicationWorker] ▶ Processing job "' + job.name + '" | id: ' + job.id + ' | comm: ' + communicationId
      );
      const communicationService = require('../services/communicationService');
      await communicationService.processCommunication(communicationId);
      console.log('[CommunicationWorker] ✅ Job completed: ' + job.id);
    },
    {
      connection:  getRedisConnection(),
      concurrency: 2,
      limiter:     { max: 10, duration: 60000 },
    }
  );

  worker.on('failed', async function(job, err) {
    console.error(
      '[CommunicationWorker] ❌ Job failed: ' + (job && job.id) +
      ' | attempt ' + (job && job.attemptsMade) + ' | ' + err.message
    );

    if (job && job.attemptsMade >= (job.opts && job.opts.attempts || 3)) {
      console.error('[CommunicationWorker] 🚨 FINAL FAILURE — comm: ' + (job.data && job.data.communicationId));
      try {
        const Communication = require('../models/Communication');
        await Communication.findByIdAndUpdate(job.data.communicationId, {
          status:       'failed',
          errorMessage: err.message,
        });
      } catch (dbErr) {
        console.error('[CommunicationWorker] DB update failed:', dbErr.message);
      }
    }
  });

  worker.on('completed', function(job) {
    console.log('[CommunicationWorker] ✅ Completed: ' + job.id + ' (' + job.name + ')');
  });

  console.log('✓ Communication worker started');
  return worker;
};

const stopCommunicationWorker = async function() {
  if (worker) {
    await worker.close();
    console.log('[CommunicationWorker] Worker stopped');
  }
};

module.exports = { startCommunicationWorker, stopCommunicationWorker };