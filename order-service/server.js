const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config');
const productRoutes = require('./routes/product-routes');
const orderRoutes = require('./routes/order-routes');
const { startService } = require('./consul-registration');

const app = express();
app.use(cors());
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'order-service' }));

app.use('/products', productRoutes);
app.use('/orders', orderRoutes);

async function start() {
  await mongoose.connect(config.mongoUri);
  await startService(app, 'order-service', config.port);
  console.log(`Order service listening on port ${config.port}`);
}

start().catch((error) => { console.error(error); process.exit(1); });
