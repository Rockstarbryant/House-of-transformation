// server/workers/communicationWorker.js
const { Worker } = require('bullmq');
const redis      = require('../config/redis');

let worker;

const startCommunicationWorker = () => {
  if (!process.env.BREVO_API_KEY) {
    console.warn('[CommunicationWorker] ⚠ BREVO_API_KEY not set — jobs will process but email sends will be skipped');
  }

  worker = new Worker(
    'communications',
    async (job) => {
      const { communicationId } = job.data;
      console.log(`[CommunicationWorker] ▶ Processing job "${job.name}" | id: ${job.id} | comm: ${communicationId}`);

      // Lazy-require to avoid circular dependency at startup
      const communicationService = require('../services/communicationService');
      await communicationService.processCommunication(communicationId);

      console.log(`[CommunicationWorker] ✅ Job completed: ${job.id}`);
    },
    {
      connection:  redis,
      concurrency: 2,
      limiter:     { max: 10, duration: 60_000 },
    }
  );

  worker.on('failed', async (job, err) => {
    console.error(
      `[CommunicationWorker] ❌ Job failed: ${job?.id} | attempt ${job?.attemptsMade}/${job?.opts?.attempts} | ${err.message}`
    );

    // Mark as permanently failed after all retries exhausted
    if (job?.attemptsMade >= (job?.opts?.attempts || 3)) {
      console.error(`[CommunicationWorker] 🚨 FINAL FAILURE — comm: ${job?.data?.communicationId}`);
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

  worker.on('completed', (job) =>
    console.log(`[CommunicationWorker] ✅ Completed: ${job.id} (${job.name})`)
  );

  console.log('✓ Communication worker started');
  return worker;
};

const stopCommunicationWorker = async () => {
  if (worker) {
    await worker.close();
    console.log('[CommunicationWorker] Worker stopped');
  }
};

module.exports = { startCommunicationWorker, stopCommunicationWorker };