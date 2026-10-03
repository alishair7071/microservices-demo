const express = require('express');
const { logTraceEvent } = require('../correlated-logger');

const router = express.Router();

router.post('/', async (request, response) => {
  const failTarget = request.query.failTarget === '1';
  logTraceEvent('info', 'lab.request.received', { failTarget });

  try {
    logTraceEvent('info', 'lab.target.call.started');
    const targetResponse = await fetch('http://resilience-target-service:4010/trace-demo', {
      method: 'POST',
      headers: { 'x-demo-fail-target': failTarget ? '1' : '0' }
    });
    const target = await targetResponse.json();
    const statusCode = targetResponse.ok ? 200 : 502;
    logTraceEvent(targetResponse.ok ? 'info' : 'error', 'lab.target.response.received', {
      targetStatusCode: targetResponse.status
    });
    logTraceEvent(targetResponse.ok ? 'info' : 'error', 'lab.response.sent', { statusCode });
    return response.status(statusCode).json({
      record: target.record || null,
      error: target.error || null
    });
  } catch (error) {
    logTraceEvent('error', 'lab.target.call.failed', { error: error.message });
    logTraceEvent('error', 'lab.response.sent', { statusCode: 502 });
    return response.status(502).json({ record: null, error: error.message });
  }
});

module.exports = router;
