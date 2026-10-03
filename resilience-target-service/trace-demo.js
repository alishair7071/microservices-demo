const { MongoClient } = require('mongodb');

const mongoClient = new MongoClient('mongodb://mongo:27017', { serverSelectionTimeoutMS: 3000 });

async function handleTraceDemo(request, response) {
  let record;
  let error;

  try {
    await mongoClient.connect();
    const collection = mongoClient.db('resilience_trace_db').collection('requests');

    if (request.headers['x-demo-fail-target'] === '1') {
      // MongoDB rejects this query, so its auto-instrumented operation records a real error.
      await collection.findOne({ $invalidDemoOperator: true });
    } else {
      const inserted = await collection.insertOne({ createdAt: new Date() });
      const saved = await collection.findOne({ _id: inserted.insertedId });
      record = { id: saved._id.toString(), createdAt: saved.createdAt.toISOString() };
    }
  } catch (problem) {
    error = problem.message;
  }

  response.writeHead(error ? 503 : 200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ record, error }));
}

module.exports = { handleTraceDemo };
