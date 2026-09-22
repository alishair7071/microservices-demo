const mongoose = require('mongoose');

module.exports = mongoose.model('Payment', new mongoose.Schema({
  orderId: String,
  amount: Number,
  status: String,
  transactionId: String,
  createdAt: Date
}));
