const express = require('express');
const Order = require('../models/order');
const { reduceStock, restoreStock } = require('../grpc/inventory-client');
const { publishOrderCreated } = require('../messaging/order-events');

const router = express.Router();

router.post('/', async (req, res) => {
  const { productId, quantity, customerName, userEmail } = req.body;

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return res.status(400).json({ error: 'Quantity must be positive' });
  }
  if (!userEmail) return res.status(400).json({ error: 'Customer email is required' });

  let stockReserved = false;

  try {
    const inventoryResponse = await fetch('http://inventory-service:4001/products');
    const products = await inventoryResponse.json();
    if (!inventoryResponse.ok) throw new Error(products.error || 'Inventory request failed');

    const product = products.find((item) => item._id === productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const stock = await reduceStock(productId, quantity);
    if (!stock.success) return res.status(400).json({ error: 'Not enough stock available' });
    stockReserved = true;

    // Local demo switch: fail after Inventory commits, to exercise Saga compensation.
    if (req.body.simulateSagaFailure === true) {
      throw new Error('Simulated failure while saving the order');
    }

    const order = await Order.create({
      productId,
      productName: product.name,
      quantity,
      customerName,
      userEmail,
      status: 'pending_payment',
      createdAt: new Date()
    });

    // Both database steps succeeded. RabbitMQ keeps its existing publish/retry behavior.
    stockReserved = false;
    await publishOrderCreated(order);
    return res.status(201).json(order);
  } catch (error) {
    if (stockReserved) {
      try {
        const restoredStock = await restoreStock(productId, quantity);
        if (!restoredStock.success) throw new Error('Inventory could not restore the reserved stock');

        return res.status(502).json({
          error: `${error.message}. Saga compensation restored the stock.`,
          sagaCompensated: true
        });
      } catch (compensationError) {
        return res.status(500).json({
          error: `${error.message}. Saga compensation failed: ${compensationError.message}`,
          sagaCompensated: false
        });
      }
    }

    return res.status(502).json({ error: `Order could not be created: ${error.message}` });
  }
});

router.post('/:id/pay', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'paid') return res.status(400).json({ error: 'Order is already paid' });

    const paymentResponse = await fetch('http://payment-service:4002/charge', {
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
    const payment = await paymentResponse.json();
    if (!paymentResponse.ok) throw new Error(payment.error || 'Payment request failed');
    if (!payment.success) return res.status(502).json({ error: 'Payment failed' });

    order.status = 'paid';
    await order.save();
    return res.json({ success: true, transactionId: payment.transactionId, order });
  } catch (error) {
    return res.status(502).json({ error: `Payment could not be completed: ${error.message}` });
  }
});

router.get('/', async (_req, res) => {
  try {
    return res.json(await Order.find().sort({ createdAt: -1 }));
  } catch (_error) {
    return res.status(500).json({ error: 'Could not fetch orders' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    return res.json({ success: true, order });
  } catch (_error) {
    return res.status(400).json({ error: 'Could not delete order' });
  }
});

module.exports = router;
