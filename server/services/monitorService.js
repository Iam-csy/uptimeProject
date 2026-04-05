const axios = require('axios');
const Monitor = require('../models/Monitor');
const { sendDownAlert, sendRecoveryAlert } = require('./emailService');

const ALERT_COOLDOWN_MS = 30 * 60 * 1000; // 30 min — avoid spam
const FAILURES_BEFORE_ALERT = 2; // Alert after 2 consecutive failures

/**
 * Perform a single HTTP check on a monitor
 */
const checkUrl = async (monitor) => {
  const start = Date.now();
  try {
    const response = await axios({
      method: monitor.method || 'GET',
      url: monitor.url,
      timeout: monitor.timeoutMs || 10000,
      validateStatus: () => true, // Accept any status
      maxRedirects: 5,
      headers: {
        'User-Agent': 'UptimeMonitor/1.0',
      },
    });

    const responseTimeMs = Date.now() - start;
    const isUp = response.status === monitor.expectedStatusCode;

    return {
      status: isUp ? 'up' : 'down',
      statusCode: response.status,
      responseTimeMs,
      checkedAt: new Date(),
      errorMessage: isUp ? null : `Expected ${monitor.expectedStatusCode}, got ${response.status}`,
    };
  } catch (err) {
    const responseTimeMs = Date.now() - start;

    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return {
        status: 'timeout',
        statusCode: null,
        responseTimeMs,
        checkedAt: new Date(),
        errorMessage: `Request timed out after ${monitor.timeoutMs}ms`,
      };
    }

    return {
      status: 'error',
      statusCode: null,
      responseTimeMs,
      checkedAt: new Date(),
      errorMessage: err.message || 'Unknown error',
    };
  }
};

/**
 * Process a single monitor: check, update, and alert
 */
const processMonitor = async (monitor) => {
  const result = await checkUrl(monitor);

  const wasDown = monitor.currentStatus !== 'up' && monitor.currentStatus !== 'pending';
  const isNowDown = result.status !== 'up';

  // Update status tracking
  monitor.currentStatus = result.status;
  monitor.lastCheckedAt = result.checkedAt;

  if (result.status === 'up') {
    monitor.lastUpAt = result.checkedAt;
    monitor.consecutiveFailures = 0;

    // Send recovery alert if it was previously down
    if (wasDown && monitor.lastDownAt) {
      const cooldownOk =
        !monitor.recoveryAlertSentAt ||
        Date.now() - monitor.recoveryAlertSentAt.getTime() > ALERT_COOLDOWN_MS;

      if (cooldownOk) {
        monitor.recoveryAlertSentAt = new Date();
        sendRecoveryAlert({ monitor, checkResult: result }).catch(console.error);
      }
    }
  } else {
    monitor.lastDownAt = result.checkedAt;
    monitor.consecutiveFailures = (monitor.consecutiveFailures || 0) + 1;

    // Alert after enough consecutive failures and cooldown passed
    if (monitor.consecutiveFailures >= FAILURES_BEFORE_ALERT) {
      const cooldownOk =
        !monitor.alertSentAt ||
        Date.now() - monitor.alertSentAt.getTime() > ALERT_COOLDOWN_MS;

      if (cooldownOk) {
        monitor.alertSentAt = new Date();
        sendDownAlert({ monitor, checkResult: result }).catch(console.error);
      }
    }
  }

  monitor.addCheckResult(result);
  await monitor.save();

  return result;
};

/**
 * Run checks for all active monitors (called by cron)
 */
const runAllChecks = async () => {
  try {
    const monitors = await Monitor.find({ isActive: true });
    console.log(`🔍 Running checks for ${monitors.length} monitor(s)...`);

    const results = await Promise.allSettled(
      monitors.map((m) => processMonitor(m))
    );

    const passed = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    console.log(`✅ Checks complete — ${passed} passed, ${failed} errors`);
  } catch (err) {
    console.error(`❌ runAllChecks error: ${err.message}`);
  }
};

module.exports = { checkUrl, processMonitor, runAllChecks };
