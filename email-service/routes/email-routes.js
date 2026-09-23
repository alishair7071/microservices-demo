const express = require('express');

function createEmailRoutes(sentEmails, kafkaEmails, state, instanceName) {
  const router = express.Router();

  router.get('/emails', (_req, res) => {
    res.json(sentEmails);
  });

  router.get('/kafka/emails', (_req, res) => {
    res.json({ emails: kafkaEmails });
  });

  router.get('/health', (_req, res) => {
    res.status(state.ready ? 200 : 503).json({
      status: state.ready ? 'ok' : 'starting',
      service: 'email-service',
      instance: instanceName
    });
  });

  return router;
}

module.exports = createEmailRoutes;
