const express = require('express');
const { randomUUID } = require('crypto');
const Payment = require('../models/payment');

const router = express.Router();

router.post('/charge', async (req, res) => {
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

module.exports = router;
