const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config');
const productRoutes = require('./routes/product-routes');
const orderRoutes = require('./routes/order-routes');
const circuitBreakerDemoRoutes = require('./routes/circuit-breaker-demo-routes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/resilience/circuit-breaker-demo', circuitBreakerDemoRoutes);

async function start() {
  await mongoose.connect(config.mongoUri);
  app.listen(config.port, () => console.log(`Order service listening on port ${config.port}`));
}

start().catch((error) => { console.error(error); process.exit(1); });
