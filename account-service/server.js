const express = require('express');
const mongoose = require('mongoose');
const config = require('./config');
const accountRoutes = require('./routes/account-routes');
const { startService, deregisterService } = require('./consul-registration');

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'account-service' }));
app.use('/accounts', accountRoutes);

let server;
let serviceId;

async function start() {
  await mongoose.connect(config.mongoUri);
  const registration = await startService(app, 'account-service', config.port);
  server = registration.server;
  serviceId = registration.serviceId;
  console.log(`Account Service listening on port ${config.port}`);
}

start().catch((error) => { console.error(error); process.exit(1); });

process.on('SIGTERM', async () => {
  await deregisterService(serviceId).catch(() => {});
  server?.close();
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
});
