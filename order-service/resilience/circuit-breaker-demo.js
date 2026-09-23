const CircuitBreaker = require('opossum');

// One breaker for all demo requests, so it remembers failures between clicks.
const breaker = new CircuitBreaker(
  async (delayMs, signal) => {
    const response = await fetch(`http://resilience-demo-service:4010/respond?delayMs=${delayMs}`, { signal });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Downstream request failed');
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

module.exports = { breaker, getStatus };
