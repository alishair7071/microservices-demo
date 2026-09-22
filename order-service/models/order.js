const mongoose = require('mongoose');

module.exports = mongoose.model('Order', new mongoose.Schema({
  productId: String,
  productName: String,
  quantity: Number,
  customerName: String,
  status: String,
  createdAt: Date
}));
