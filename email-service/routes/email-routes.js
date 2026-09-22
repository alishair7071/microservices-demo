const express = require('express');

function createEmailRoutes(sentEmails, isReady) {
  const router = express.Router();

  router.get('/emails', (_req, res) => {
    res.json(sentEmails);
  });

  router.get('/health', (_req, res) => {
    res.status(isReady() ? 200 : 503).json({
      status: isReady() ? 'ok' : 'starting',
      service: 'email-service'
    });
  });

  return router;
}

module.exports = createEmailRoutes;
