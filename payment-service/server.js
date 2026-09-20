const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { randomUUID } = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const Payment = mongoose.model('Payment', new mongoose.Schema({
  orderId: String,
  amount: Number,
  status: String,
  transactionId: String,
  createdAt: Date
}));

app.post('/charge', async (req, res) => {
  try {
    const transactionId = randomUUID();
    await Payment.create({
      orderId: req.body.orderId,
      amount: req.body.amount,
      status: 'succeeded',
      transactionId,
      createdAt: new Date()
    });
    res.json({ success: true, transactionId });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Could not process payment' });
  }
});

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  app.listen(process.env.PORT || 4002, () => console.log('Payment service listening'));
}

start().catch((error) => { console.error(error); process.exit(1); });
