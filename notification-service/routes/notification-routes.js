const express = require('express');

function createNotificationRoutes(notifications, isReady) {
  const router = express.Router();

  router.get('/notifications', (_req, res) => {
    res.json(notifications);
  });

  router.get('/health', (_req, res) => {
    res.status(isReady() ? 200 : 503).json({
      status: isReady() ? 'ok' : 'starting',
      service: 'notification-service'
    });
  });

  return router;
}

module.exports = createNotificationRoutes;
