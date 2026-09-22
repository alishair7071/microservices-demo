const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const config = require('./config');
const paymentRoutes = require('./routes/payment-routes');
const { connectKafka } = require('./kafka/kafka-producer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(paymentRoutes);

async function start() {
  await mongoose.connect(config.mongoUri);
  app.listen(config.port, () => console.log(`Payment service listening on port ${config.port}`));
  connectKafka();
}

start().catch((error) => { console.error(error); process.exit(1); });
