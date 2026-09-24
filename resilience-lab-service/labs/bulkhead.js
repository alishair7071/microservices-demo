const express = require('express');

const router = express.Router();
const maxConcurrentRequests = 2;
let activeRequests = 0;

router.get('/', async (_req, res) => {
  res.set('Cache-Control', 'no-store');

  if (activeRequests >= maxConcurrentRequests) {
    return res.status(503).json({
      success: false,
      message: 'Bulkhead is full. This request was rejected without calling the target.',
      activeRequests,
      maxConcurrentRequests
    });
  }

  activeRequests++;

  try {
    const response = await fetch('http://resilience-target-service:4010/respond?delayMs=5000');
    const body = await response.json();

    return res.status(response.status).json({
      ...body,
      activeRequests,
      maxConcurrentRequests
    });
  } catch (error) {
    return res.status(502).json({
      success: false,
      message: `Target request failed: ${error.message}`,
      activeRequests,
      maxConcurrentRequests
    });
  } finally {
    activeRequests--;
  }
});

module.exports = router;
