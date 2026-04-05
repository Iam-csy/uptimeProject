const validator = require('validator');
const Monitor = require('../models/Monitor');
const { processMonitor } = require('../services/monitorService');

// ─── Create Monitor ───────────────────────────────────────
exports.createMonitor = async (req, res, next) => {
  try {
    const { name, url, method, expectedStatusCode, checkIntervalMinutes, timeoutMs, alertEmails } = req.body;

    if (!name || !url) {
      return res.status(400).json({ success: false, message: 'Name and URL are required' });
    }

    if (!validator.isURL(url, { require_protocol: true })) {
      return res.status(400).json({ success: false, message: 'Please provide a valid URL with protocol (https://)' });
    }

    // Validate alert emails
    const emails = Array.isArray(alertEmails) ? alertEmails : [];
    for (const email of emails) {
      if (!validator.isEmail(email)) {
        return res.status(400).json({ success: false, message: `Invalid email: ${email}` });
      }
    }

    const monitor = await Monitor.create({
      user: req.user._id,
      name,
      url,
      method: method || 'GET',
      expectedStatusCode: expectedStatusCode || 200,
      checkIntervalMinutes: checkIntervalMinutes || 5,
      timeoutMs: timeoutMs || 10000,
      alertEmails: emails.length > 0 ? emails : [req.user.email],
    });

    res.status(201).json({ success: true, data: { monitor } });
  } catch (err) {
    next(err);
  }
};

// ─── Get All Monitors (own) ───────────────────────────────
exports.getMonitors = async (req, res, next) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.status) filter.currentStatus = req.query.status;
    if (req.query.active !== undefined) filter.isActive = req.query.active === 'true';

    const monitors = await Monitor.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: monitors.length, data: { monitors } });
  } catch (err) {
    next(err);
  }
};

// ─── Get Single Monitor ───────────────────────────────────
exports.getMonitor = async (req, res, next) => {
  try {
    const monitor = await Monitor.findOne({ _id: req.params.id, user: req.user._id });
    if (!monitor) {
      return res.status(404).json({ success: false, message: 'Monitor not found' });
    }
    res.json({ success: true, data: { monitor } });
  } catch (err) {
    next(err);
  }
};

// ─── Update Monitor ───────────────────────────────────────
exports.updateMonitor = async (req, res, next) => {
  try {
    const { name, url, method, expectedStatusCode, checkIntervalMinutes, timeoutMs, alertEmails, isActive } = req.body;

    if (url && !validator.isURL(url, { require_protocol: true })) {
      return res.status(400).json({ success: false, message: 'Invalid URL' });
    }

    const emails = Array.isArray(alertEmails) ? alertEmails : undefined;
    if (emails) {
      for (const email of emails) {
        if (!validator.isEmail(email)) {
          return res.status(400).json({ success: false, message: `Invalid email: ${email}` });
        }
      }
    }

    const update = {};
    if (name !== undefined) update.name = name;
    if (url !== undefined) update.url = url;
    if (method !== undefined) update.method = method;
    if (expectedStatusCode !== undefined) update.expectedStatusCode = expectedStatusCode;
    if (checkIntervalMinutes !== undefined) update.checkIntervalMinutes = checkIntervalMinutes;
    if (timeoutMs !== undefined) update.timeoutMs = timeoutMs;
    if (emails !== undefined) update.alertEmails = emails;
    if (isActive !== undefined) update.isActive = isActive;

    const monitor = await Monitor.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      update,
      { new: true, runValidators: true }
    );

    if (!monitor) {
      return res.status(404).json({ success: false, message: 'Monitor not found' });
    }

    res.json({ success: true, data: { monitor } });
  } catch (err) {
    next(err);
  }
};

// ─── Delete Monitor ───────────────────────────────────────
exports.deleteMonitor = async (req, res, next) => {
  try {
    const monitor = await Monitor.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!monitor) {
      return res.status(404).json({ success: false, message: 'Monitor not found' });
    }
    res.json({ success: true, message: 'Monitor deleted' });
  } catch (err) {
    next(err);
  }
};

// ─── Manual Check ─────────────────────────────────────────
exports.checkNow = async (req, res, next) => {
  try {
    const monitor = await Monitor.findOne({ _id: req.params.id, user: req.user._id });
    if (!monitor) {
      return res.status(404).json({ success: false, message: 'Monitor not found' });
    }

    const result = await processMonitor(monitor);
    res.json({ success: true, data: { result } });
  } catch (err) {
    next(err);
  }
};

// ─── Get Monitor Stats ────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const monitors = await Monitor.find({ user: req.user._id });

    const total = monitors.length;
    const up = monitors.filter((m) => m.currentStatus === 'up').length;
    const down = monitors.filter((m) => m.currentStatus !== 'up' && m.currentStatus !== 'pending').length;
    const pending = monitors.filter((m) => m.currentStatus === 'pending').length;
    const avgUptime = total
      ? parseFloat((monitors.reduce((s, m) => s + m.uptimePercent, 0) / total).toFixed(2))
      : 0;

    res.json({
      success: true,
      data: { total, up, down, pending, avgUptime },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: All monitors ──────────────────────────────────
exports.adminGetAll = async (req, res, next) => {
  try {
    const monitors = await Monitor.find().populate('user', 'name email').sort({ createdAt: -1 });
    res.json({ success: true, count: monitors.length, data: { monitors } });
  } catch (err) {
    next(err);
  }
};
