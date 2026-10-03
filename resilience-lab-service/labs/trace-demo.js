const express = require('express');

const router = express.Router();

router.post('/', async (request, response) => {
  try {
    const targetResponse = await fetch('http://resilience-target-service:4010/trace-demo', {
      method: 'POST',
      headers: { 'x-demo-fail-target': request.query.failTarget === '1' ? '1' : '0' }
    });
    const target = await targetResponse.json();
    return response.status(targetResponse.ok ? 200 : 502).json({
      record: target.record || null,
      error: target.error || null
    });
  } catch (error) {
    return response.status(502).json({ record: null, error: error.message });
  }
});

module.exports = router;
