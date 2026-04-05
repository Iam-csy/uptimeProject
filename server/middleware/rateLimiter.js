/**
 * Simple in-memory rate limiter (no external dependency)
 * For production, replace with redis-backed rate limiter
 */

const store = new Map();

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, data] of store.entries()) {
    if (now > data.resetAt) store.delete(key);
  }
}, 60 * 1000);

cleanupInterval.unref(); // Don't block process exit

const createLimiter = ({ windowMs, max, message }) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    let record = store.get(key);
    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + windowMs };
      store.set(key, record);
    }

    record.count += 1;

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

    if (record.count > max) {
      return res.status(429).json({ success: false, message });
    }

    next();
  };
};

// Auth routes — strict
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many attempts. Please try again in 15 minutes.',
});

// General API — relaxed
const apiLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Rate limit exceeded. Please slow down.',
});

module.exports = { authLimiter, apiLimiter };
