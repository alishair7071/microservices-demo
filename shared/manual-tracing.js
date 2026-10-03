const { randomBytes } = require('crypto');

// A trace keeps one ID for the whole request; every step gets its own span ID.
// Span kind: 1 = internal work, 2 = incoming server request, 3 = outgoing client request.
function startSpan(traceId, name, parentSpanId, kind) {
  return {
    traceId,
    spanId: randomBytes(8).toString('hex'),
    parentSpanId,
    name,
    kind,
    startTimeUnixNano: (BigInt(Date.now()) * 1000000n).toString()
  };
}

function finishSpan(span) {
  span.endTimeUnixNano = (BigInt(Date.now()) * 1000000n).toString();
}

function showSpan(service, span) {
  return {
    service,
    name: span.name,
    spanId: span.spanId,
    parentSpanId: span.parentSpanId || null,
    durationMs: Number(BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano)) / 1000000
  };
}

// Jaeger accepts this JSON format directly. No tracing SDK is used here.
async function sendSpans(service, spans) {
  const body = {
    resourceSpans: [{
      resource: { attributes: [{ key: 'service.name', value: { stringValue: service } }] },
      scopeSpans: [{
        scope: { name: 'manual-trace-lab' },
        spans: spans.map(({ traceId, spanId, parentSpanId, name, kind, startTimeUnixNano, endTimeUnixNano, status }) => ({
          traceId, spanId, parentSpanId, name, kind, startTimeUnixNano, endTimeUnixNano, status
        }))
      }]
    }]
  };

  const response = await fetch('http://host.docker.internal:4318/v1/traces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(2000)
  });
  if (!response.ok) throw new Error(`Jaeger rejected spans with status ${response.status}`);
}

module.exports = { startSpan, finishSpan, showSpan, sendSpans };
