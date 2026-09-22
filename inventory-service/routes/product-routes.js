const express = require('express');
const Product = require('../models/product');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const product = await Product.create({ name: req.body.name, stock: req.body.stock });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Could not create product' });
  }
});

router.get('/', async (_req, res) => {
  try {
    res.json(await Product.find());
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch products' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, product });
  } catch (error) {
    res.status(400).json({ error: 'Could not delete product' });
  }
});

module.exports = router;
