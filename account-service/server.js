const express = require('express');
const mongoose = require('mongoose');
const config = require('./config');
const accountRoutes = require('./routes/account-routes');

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'account-service' }));
app.use('/accounts', accountRoutes);

async function start() {
  await mongoose.connect(config.mongoUri);
  app.listen(config.port, () => console.log(`Account Service listening on port ${config.port}`));
}

start().catch((error) => { console.error(error); process.exit(1); });
