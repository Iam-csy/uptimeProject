const mongoose = require('mongoose');

const checkResultSchema = new mongoose.Schema(
  {
    status: { type: String, enum: ['up', 'down', 'timeout', 'error'], required: true },
    statusCode: { type: Number },
    responseTimeMs: { type: Number },
    checkedAt: { type: Date, default: Date.now },
    errorMessage: { type: String },
  },
  { _id: false }
);

const monitorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Monitor name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    url: {
      type: String,
      required: [true, 'URL is required'],
      trim: true,
    },
    method: {
      type: String,
      enum: ['GET', 'HEAD', 'POST'],
      default: 'GET',
    },
    expectedStatusCode: {
      type: Number,
      default: 200,
    },
    checkIntervalMinutes: {
      type: Number,
      default: 5,
      min: 1,
      max: 1440,
    },
    timeoutMs: {
      type: Number,
      default: 10000,
    },
    alertEmails: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    currentStatus: {
      type: String,
      enum: ['up', 'down', 'timeout', 'error', 'pending'],
      default: 'pending',
    },
    lastCheckedAt: { type: Date },
    lastDownAt: { type: Date },
    lastUpAt: { type: Date },
    uptimePercent: { type: Number, default: 100 },
    avgResponseTimeMs: { type: Number, default: 0 },
    totalChecks: { type: Number, default: 0 },
    totalDownChecks: { type: Number, default: 0 },

    // Last N checks stored inline for quick graph display
    recentChecks: {
      type: [checkResultSchema],
      default: [],
    },

    // Track consecutive failures to avoid spam alerts
    consecutiveFailures: { type: Number, default: 0 },
    alertSentAt: { type: Date },
    recoveryAlertSentAt: { type: Date },
  },
  { timestamps: true }
);

// Keep recentChecks to last 100 entries
monitorSchema.methods.addCheckResult = function (result) {
  this.recentChecks.push(result);
  if (this.recentChecks.length > 100) {
    this.recentChecks = this.recentChecks.slice(-100);
  }

  this.totalChecks += 1;
  if (result.status !== 'up') this.totalDownChecks += 1;

  this.uptimePercent = parseFloat(
    (((this.totalChecks - this.totalDownChecks) / this.totalChecks) * 100).toFixed(2)
  );

  const upChecks = this.recentChecks.filter(
    (c) => c.status === 'up' && c.responseTimeMs
  );
  if (upChecks.length > 0) {
    const total = upChecks.reduce((sum, c) => sum + c.responseTimeMs, 0);
    this.avgResponseTimeMs = Math.round(total / upChecks.length);
  }
};

module.exports = mongoose.model('Monitor', monitorSchema);
