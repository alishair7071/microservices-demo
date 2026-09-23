const express = require('express');
const CircuitBreaker = require('opossum');

const router = express.Router();

// Keep one breaker so it remembers failures between requests.
const breaker = new CircuitBreaker(
  async (delayMs, signal) => {
    const response = await fetch(`http://resilience-target-service:4010/respond?delayMs=${delayMs}`, { signal });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Target request failed');
    return body;
  },
  {
    timeout: 3000,
    errorThresholdPercentage: 50,
    volumeThreshold: 3,
    resetTimeout: 15000
  }
);

let lastEvent = 'The circuit breaker is ready.';
breaker.on('open', () => { lastEvent = 'Circuit opened after repeated failures.'; });
breaker.on('halfOpen', () => { lastEvent = 'Circuit is half-open and will allow one test request.'; });
breaker.on('close', () => { lastEvent = 'Circuit closed after a successful recovery request.'; });
breaker.on('timeout', () => { lastEvent = 'A request exceeded the 3-second timeout.'; });

function getStatus() {
  return {
    state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
    lastEvent,
    timeoutMs: 3000,
    resetAfterMs: 15000,
    totalRequests: breaker.stats.fires,
    successfulRequests: breaker.stats.successes,
    failedRequests: breaker.stats.failures,
    rejectedRequests: breaker.stats.rejects,
    timedOutRequests: breaker.stats.timeouts
  };
}

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
          ? 'Request timed out after 3 seconds before the target responded.'
          : `Target service could not be reached: ${error.message}`,
      breaker: getStatus()
    });
  }
});

router.get('/status', (_req, res) => res.json({ breaker: getStatus() }));

module.exports = router;
