const express = require('express');

function createEmailRoutes(sentEmails, kafkaEmails, isReady, instanceName) {
  const router = express.Router();

  router.get('/emails', (_req, res) => {
    res.json(sentEmails);
  });

  router.get('/kafka/emails', (_req, res) => {
    res.json({ emails: kafkaEmails });
  });

  router.get('/health', (_req, res) => {
    res.status(isReady() ? 200 : 503).json({
      status: isReady() ? 'ok' : 'starting',
      service: 'email-service',
      instance: instanceName
    });
  });

  return router;
}

module.exports = createEmailRoutes;
