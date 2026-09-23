const express = require('express');

const router = express.Router();

router.get('/', async (_req, res) => {
  const attempts = [];

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`http://resilience-demo-service:4010/retry?attempt=${attempt}`);
      const body = await response.json();

      attempts.push({
        number: attempt,
        status: response.status,
        message: body.message || body.error || 'No message returned'
      });

      if (response.ok) {
        return res.json({ success: true, message: body.message, attempts });
      }

      // Only a temporary 503 response is worth trying again.
      if (response.status !== 503) {
        return res.status(502).json({ success: false, message: 'Downstream returned a permanent error.', attempts });
      }
    } catch (error) {
      // A connection failure may be temporary, so it also gets another attempt.
      attempts.push({ number: attempt, status: 'NETWORK_ERROR', message: error.message });
    }

    if (attempt < 3) {
      const baseWaitMs = 200 * 2 ** (attempt - 1);
      const jitterMs = Math.floor(Math.random() * 101);
      const waitMs = baseWaitMs + jitterMs;
      attempts[attempts.length - 1].waitMs = waitMs;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  return res.status(503).json({ success: false, message: 'All 3 attempts failed.', attempts });
});

module.exports = router;
