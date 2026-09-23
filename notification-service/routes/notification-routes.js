const express = require('express');

function createNotificationRoutes(notifications, kafkaNotifications, state) {
  const router = express.Router();

  router.get('/notifications', (_req, res) => {
    res.json(notifications);
  });

  router.get('/kafka/notifications', (_req, res) => {
    res.json({ notifications: kafkaNotifications });
  });

  router.get('/health', (_req, res) => {
    res.status(state.ready ? 200 : 503).json({
      status: state.ready ? 'ok' : 'starting',
      service: 'notification-service'
    });
  });

  return router;
}

module.exports = createNotificationRoutes;
