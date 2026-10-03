const { MongoClient } = require('mongodb');
const { logTraceEvent } = require('./correlated-logger');

const mongoClient = new MongoClient('mongodb://mongo:27017', { serverSelectionTimeoutMS: 3000 });

async function handleTraceDemo(request, response) {
  let record;
  let error;
  const failTarget = request.headers['x-demo-fail-target'] === '1';
  logTraceEvent('info', 'target.request.received', { failTarget });

  try {
    await mongoClient.connect();
    const collection = mongoClient.db('resilience_trace_db').collection('requests');

    if (failTarget) {
      // MongoDB rejects this query, so its auto-instrumented operation records a real error.
      logTraceEvent('info', 'target.mongodb.query.started');
      await collection.findOne({ $invalidDemoOperator: true });
    } else {
      logTraceEvent('info', 'target.mongodb.insert.started');
      const inserted = await collection.insertOne({ createdAt: new Date() });
      const saved = await collection.findOne({ _id: inserted.insertedId });
      record = { id: saved._id.toString(), createdAt: saved.createdAt.toISOString() };
      logTraceEvent('info', 'target.mongodb.record.read', { recordId: record.id });
    }
  } catch (problem) {
    error = problem.message;
    logTraceEvent('error', 'target.mongodb.failed', { error });
  }

  const statusCode = error ? 503 : 200;
  logTraceEvent(error ? 'error' : 'info', 'target.response.sent', { statusCode });
  response.writeHead(statusCode, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ record, error }));
}

module.exports = { handleTraceDemo };
