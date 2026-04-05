const cron = require('node-cron');
const { runAllChecks } = require('./monitorService');

let task = null;

const startScheduler = () => {
  const interval = parseInt(process.env.CHECK_INTERVAL_MINUTES) || 5;

  // Cron: every N minutes
  const cronExpr = `*/${interval} * * * *`;

  task = cron.schedule(cronExpr, async () => {
    console.log(`⏰ [${new Date().toISOString()}] Cron triggered monitor checks`);
    await runAllChecks();
  });

  console.log(`🕒 Monitor scheduler started — every ${interval} minute(s)`);

  // Run immediately on startup
  runAllChecks();
};

const stopScheduler = () => {
  if (task) {
    task.stop();
    console.log('🛑 Monitor scheduler stopped');
  }
};

module.exports = { startScheduler, stopScheduler };
