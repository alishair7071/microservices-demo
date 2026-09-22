const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config');
const productRoutes = require('./routes/product-routes');
const { seedProducts } = require('./services/stock-service');
const { startGrpcServer } = require('./grpc/inventory-server');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/products', productRoutes);

async function start() {
  await mongoose.connect(config.mongoUri);
  await seedProducts();
  app.listen(config.port, () => console.log(`Inventory service listening on port ${config.port}`));
  startGrpcServer();
}

start().catch((error) => { console.error(error); process.exit(1); });
