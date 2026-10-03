const { trace } = require('@opentelemetry/api');

function logTraceEvent(level, event, fields = {}) {
  const span = trace.getActiveSpan();
  const spanContext = span?.spanContext();

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: process.env.OTEL_SERVICE_NAME,
    event,
    traceId: spanContext?.traceId || null,
    spanId: spanContext?.spanId || null,
    ...fields
  }));

  // Jaeger displays these point-in-time events on the current span.
  span?.addEvent(event, { 'log.level': level, ...fields });
}

module.exports = { logTraceEvent };
