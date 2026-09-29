const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config');
const productRoutes = require('./routes/product-routes');
const { seedProducts } = require('./services/stock-service');
const { startGrpcServer } = require('./grpc/inventory-server');
const { startService } = require('./consul-registration');

const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'inventory-service' }));
app.use('/products', productRoutes);

async function start() {
  await mongoose.connect(config.mongoUri);
  await seedProducts();
  await startService(app, 'inventory-service', config.port);
  console.log(`Inventory service listening on port ${config.port}`);
  startGrpcServer();
}

start().catch((error) => { console.error(error); process.exit(1); });
