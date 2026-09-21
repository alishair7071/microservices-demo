const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const Order = mongoose.model('Order', new mongoose.Schema({
  productId: String,
  productName: String,
  quantity: Number,
  customerName: String,
  status: String,
  createdAt: Date
}));

const inventoryUrl = process.env.INVENTORY_SERVICE_URL;
const paymentUrl = process.env.PAYMENT_SERVICE_URL;
const packageDefinition = protoLoader.loadSync(
  path.join(__dirname, 'proto', 'inventory.proto'),
  { keepCase: true }
);
const inventoryGrpc = grpc.loadPackageDefinition(packageDefinition).inventory;
const inventoryClient = new inventoryGrpc.InventoryService(
  process.env.INVENTORY_GRPC_ADDRESS,
  grpc.credentials.createInsecure()
);

async function serviceJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Service request failed');
  return body;
}

// Convert the callback-based gRPC client method into a Promise for use with await.
function reduceStockByGrpc(productId, quantity) {
  return new Promise((resolve, reject) => {
    inventoryClient.ReduceStock(
      { product_id: productId, quantity },
      (error, response) => error ? reject(error) : resolve(response)
    );
  });
}

app.post('/products', async (req, res) => {
  try {
    const product = await serviceJson(`${inventoryUrl}/products`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body)
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(502).json({ error: `Inventory service error: ${error.message}` });
  }
});

app.get('/products', async (_req, res) => {
  try {
    res.json(await serviceJson(`${inventoryUrl}/products`));
  } catch (error) {
    res.status(502).json({ error: `Inventory service error: ${error.message}` });
  }
});

app.post('/orders', async (req, res) => {
  const { productId, quantity, customerName } = req.body;
  try {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be positive' });
    }
    const products = await serviceJson(`${inventoryUrl}/products`);
    const product = products.find((item) => item._id === productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const stock = await reduceStockByGrpc(productId, quantity);
    if (!stock.success) return res.status(400).json({ error: 'Not enough stock available' });

    const order = await Order.create({
      productId, productName: product.name, quantity, customerName,
      status: 'pending_payment', createdAt: new Date()
    });
    res.status(201).json(order);
  } catch (error) {
    res.status(502).json({ error: `Order could not be created: ${error.message}` });
  }
});

app.post('/orders/:id/pay', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'paid') return res.status(400).json({ error: 'Order is already paid' });

    const payment = await serviceJson(`${paymentUrl}/charge`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order._id.toString(), amount: order.quantity })
    });
    if (!payment.success) return res.status(502).json({ error: 'Payment failed' });

    order.status = 'paid';
    await order.save();
    res.json({ success: true, transactionId: payment.transactionId, order });
  } catch (error) {
    res.status(502).json({ error: `Payment could not be completed: ${error.message}` });
  }
});

app.get('/orders', async (_req, res) => {
  try {
    res.json(await Order.find().sort({ createdAt: -1 }));
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch orders' });
  }
});

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  app.listen(process.env.PORT || 4000, () => console.log('Order service listening'));
}

start().catch((error) => { console.error(error); process.exit(1); });
