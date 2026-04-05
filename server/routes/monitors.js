const express = require('express');
const router = express.Router();
const monitorController = require('../controllers/monitorController');
const { authenticate, requireVerified, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// All monitor routes require authentication + verified email
router.use(authenticate, requireVerified, apiLimiter);

router.get('/stats', monitorController.getStats);
router.route('/').get(monitorController.getMonitors).post(monitorController.createMonitor);
router.route('/:id').get(monitorController.getMonitor).put(monitorController.updateMonitor).delete(monitorController.deleteMonitor);
router.post('/:id/check', monitorController.checkNow);

// Admin only
router.get('/admin/all', authorize('admin'), monitorController.adminGetAll);

module.exports = router;
