// Runs every day at 8:00 AM EAT (05:00 UTC)
const cron = require('node-cron');
const { addScheduledRun } = require('../queues/pledgeReminderQueue');

const startPledgeReminderScheduler = function() {
  // '0 5 * * *' = 05:00 UTC = 08:00 EAT
  cron.schedule('0 5 * * *', async function() {
    console.log('[PledgeReminderScheduler] Triggering daily reminder run');
    try {
      await addScheduledRun();
    } catch (err) {
      console.error('[PledgeReminderScheduler] Failed to queue run:', err.message);
    }
  });
  console.log('[PledgeReminderScheduler] Scheduled — daily at 08:00 EAT');
};

module.exports = { startPledgeReminderScheduler };