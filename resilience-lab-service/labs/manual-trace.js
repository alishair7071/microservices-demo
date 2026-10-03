const express = require('express');
const { randomBytes } = require('crypto');
const { startSpan, finishSpan, showSpan, sendSpans } = require('../manual-tracing');

const router = express.Router();

router.post('/', async (_request, response) => {
  const traceId = randomBytes(16).toString('hex');
  const incoming = startSpan(traceId, 'Lab receives request', undefined, 2);
  const outgoing = startSpan(traceId, 'Lab calls Target', incoming.spanId, 3);
  let target = {};
  let status = 200;

  try {
    const targetResponse = await fetch('http://resilience-target-service:4010/manual-trace', {
      method: 'POST',
      // The same trace ID travels to Target; this outgoing span becomes its parent.
      headers: { traceparent: `00-${traceId}-${outgoing.spanId}-01` }
    });
    target = await targetResponse.json();
    if (!targetResponse.ok) {
      status = 502;
      outgoing.status = { code: 2, message: target.error || 'Target request failed' };
    }
  } catch (error) {
    status = 502;
    target = { error: error.message };
    outgoing.status = { code: 2, message: error.message };
  }

  finishSpan(outgoing);
  if (status !== 200) incoming.status = { code: 2, message: target.error || 'Target request failed' };
  finishSpan(incoming);

  let jaegerSent = false;
  try {
    await sendSpans('resilience-lab-service', [incoming, outgoing]);
    jaegerSent = true;
  } catch (error) {
    console.error('Could not send Lab spans to Jaeger:', error.message);
  }

  response.status(status).json({
    traceId,
    record: target.record || null,
    error: target.error,
    jaegerSent: jaegerSent && target.jaegerSent === true,
    steps: [
      showSpan('resilience-lab-service', incoming),
      showSpan('resilience-lab-service', outgoing),
      ...(target.steps || [])
    ]
  });
});

module.exports = router;
