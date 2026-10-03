const { MongoClient } = require('mongodb');
const { startSpan, finishSpan, showSpan, sendSpans } = require('./manual-tracing');

const mongoClient = new MongoClient('mongodb://mongo:27017', { serverSelectionTimeoutMS: 3000 });

async function handleManualTrace(request, response) {
  // Header format: version-traceId-parentSpanId-flags.
  // Read the header that the Lab Service manually attached to its fetch request.
  const match = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/.exec(request.headers.traceparent || '');
  if (!match) {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'A valid traceparent header is required.' }));
    return;
  }

  const traceId = match[1];
  const incoming = startSpan(traceId, 'Target receives request', match[2], 2);
  const database = startSpan(traceId, 'MongoDB insert and read', incoming.spanId, 1);
  let record;
  let error;

  try {
    await mongoClient.connect();
    const collection = mongoClient.db('resilience_trace_db').collection('requests');
    const inserted = await collection.insertOne({ createdAt: new Date() });
    const saved = await collection.findOne({ _id: inserted.insertedId });
    record = { id: saved._id.toString(), createdAt: saved.createdAt.toISOString() };
  } catch (problem) {
    error = problem.message;
    database.status = { code: 2, message: error };
    incoming.status = { code: 2, message: error };
  }

  finishSpan(database);
  finishSpan(incoming);

  let jaegerSent = false;
  try {
    await sendSpans('resilience-target-service', [incoming, database]);
    jaegerSent = true;
  } catch (problem) {
    console.error('Could not send Target spans to Jaeger:', problem.message);
  }

  response.writeHead(error ? 503 : 200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({
    traceId,
    record,
    error,
    jaegerSent,
    steps: [showSpan('resilience-target-service', incoming), showSpan('resilience-target-service', database)]
  }));
}

module.exports = { handleManualTrace };
