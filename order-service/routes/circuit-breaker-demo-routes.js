const express = require('express');
const { breaker, getStatus } = require('../resilience/circuit-breaker-demo');

const router = express.Router();

router.get('/', async (req, res) => {
  const delayMs = Number(req.query.delayMs) === 5000 ? 5000 : 0;

  try {
    const result = await breaker.fire(delayMs, breaker.getSignal());
    return res.json({ result, breaker: getStatus() });
  } catch (error) {
    const isOpen = error.code === 'EOPENBREAKER';
    const isTimeout = error.code === 'ETIMEDOUT';
    return res.status(isOpen ? 503 : isTimeout ? 504 : 502).json({
      success: false,
      message: isOpen
        ? 'Circuit is open: this request was rejected immediately.'
        : isTimeout
          ? 'Request timed out after 3 seconds before the downstream service responded.'
          : `Downstream demo service could not be reached: ${error.message}`,
      breaker: getStatus()
    });
  }
});

router.get('/status', (_req, res) => res.json({ breaker: getStatus() }));

module.exports = router;
