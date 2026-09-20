const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

const Product = mongoose.model('Product', new mongoose.Schema({
  name: String,
  stock: Number
}));

async function seedProducts() {
  if (await Product.countDocuments() === 0) {
    await Product.insertMany([
      { name: 'Notebook', stock: 20 },
      { name: 'Coffee Mug', stock: 15 },
      { name: 'Desk Lamp', stock: 10 }
    ]);
    console.log('Seeded sample products');
  }
}

app.post('/products', async (req, res) => {
  try {
    const product = await Product.create({ name: req.body.name, stock: req.body.stock });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Could not create product' });
  }
});

app.get('/products', async (_req, res) => {
  try {
    res.json(await Product.find());
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch products' });
  }
});

app.post('/reduce-stock', async (req, res) => {
  try {
    if (!Number.isFinite(req.body.quantity) || req.body.quantity <= 0) {
      return res.status(400).json({ success: false, remainingStock: null, error: 'Quantity must be positive' });
    }
    const product = await Product.findOneAndUpdate(
      { _id: req.body.productId, stock: { $gte: req.body.quantity } },
      { $inc: { stock: -req.body.quantity } },
      { new: true }
    );

    if (!product) return res.json({ success: false, remainingStock: null });
    res.json({ success: true, remainingStock: product.stock });
  } catch (error) {
    res.status(400).json({ success: false, remainingStock: null, error: 'Invalid product or quantity' });
  }
});

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  await seedProducts();
  app.listen(process.env.PORT || 4001, () => console.log('Inventory service listening'));
}

start().catch((error) => { console.error(error); process.exit(1); });
