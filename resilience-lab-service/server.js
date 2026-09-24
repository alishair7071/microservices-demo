const express = require('express');

const app = express();

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'resilience-lab-service' }));
app.use('/circuit-breaker', require('./labs/circuit-breaker'));
app.use('/retry', require('./labs/retry'));
app.use('/bulkhead', require('./labs/bulkhead'));

app.listen(4020, () => console.log('Resilience Lab Service listening on port 4020'));
