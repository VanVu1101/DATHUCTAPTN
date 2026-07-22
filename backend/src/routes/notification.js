const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middlewares/auth');
const notificationService = require('../services/notification');
const notificationDeliveryLogService = require('../services/notificationDeliveryLog');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const items = await notificationService.getNotificationsForUser(req.user.id, { limit: 100 });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/unreadCount', async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/read', async (req, res) => {
  try {
    const n = await notificationService.markAsRead(req.params.id, req.user.id);
    res.json({ success: true, data: n });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/delivery-logs', checkRole(['ADMIN']), async (req, res) => {
  try {
    const logs = await notificationDeliveryLogService.getDeliveryLogs({
      limit: Number(req.query.limit || 100),
      offset: Number(req.query.offset || 0),
      provider: req.query.provider || undefined,
      status: req.query.status || undefined,
      event: req.query.event || undefined,
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
