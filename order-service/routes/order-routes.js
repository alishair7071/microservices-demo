const express = require('express');
const Order = require('../models/order');
const { serviceJson } = require('../lib/http-client');
const { reduceStock } = require('../grpc/inventory-client');
const { publishOrderCreated } = require('../messaging/order-events');

function createOrderRoutes({ inventoryUrl, paymentUrl }) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const { productId, quantity, customerName, userEmail } = req.body;
    try {
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be positive' });
      }
      if (!userEmail) return res.status(400).json({ error: 'Customer email is required' });
      const products = await serviceJson(`${inventoryUrl}/products`);
      const product = products.find((item) => item._id === productId);
      if (!product) return res.status(404).json({ error: 'Product not found' });

      const stock = await reduceStock(productId, quantity);
      if (!stock.success) return res.status(400).json({ error: 'Not enough stock available' });

      const order = await Order.create({
        productId, productName: product.name, quantity, customerName, userEmail,
        status: 'pending_payment', createdAt: new Date()
      });
      await publishOrderCreated(order);
      res.status(201).json(order);
    } catch (error) {
      res.status(502).json({ error: `Order could not be created: ${error.message}` });
    }
  });

  router.post('/:id/pay', async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.status === 'paid') return res.status(400).json({ error: 'Order is already paid' });

      const payment = await serviceJson(`${paymentUrl}/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order._id.toString(),
          amount: order.quantity,
          userEmail: order.userEmail,
          customerName: order.customerName,
          productName: order.productName,
          quantity: order.quantity
        })
      });
      if (!payment.success) return res.status(502).json({ error: 'Payment failed' });

      order.status = 'paid';
      await order.save();
      res.json({ success: true, transactionId: payment.transactionId, order });
    } catch (error) {
      res.status(502).json({ error: `Payment could not be completed: ${error.message}` });
    }
  });

  router.get('/', async (_req, res) => {
    try {
      res.json(await Order.find().sort({ createdAt: -1 }));
    } catch (error) {
      res.status(500).json({ error: 'Could not fetch orders' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const order = await Order.findByIdAndDelete(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      res.json({ success: true, order });
    } catch (error) {
      res.status(400).json({ error: 'Could not delete order' });
    }
  });

  return router;
}

module.exports = createOrderRoutes;
