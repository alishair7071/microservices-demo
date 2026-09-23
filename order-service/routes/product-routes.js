const express = require('express');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const inventoryResponse = await fetch('http://inventory-service:4001/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const product = await inventoryResponse.json();
    if (!inventoryResponse.ok) throw new Error(product.error || 'Inventory request failed');
    return res.status(201).json(product);
  } catch (error) {
    return res.status(502).json({ error: `Inventory service error: ${error.message}` });
  }
});

router.get('/', async (_req, res) => {
  try {
    const inventoryResponse = await fetch('http://inventory-service:4001/products');
    const products = await inventoryResponse.json();
    if (!inventoryResponse.ok) throw new Error(products.error || 'Inventory request failed');
    return res.json(products);
  } catch (error) {
    return res.status(502).json({ error: `Inventory service error: ${error.message}` });
  }
});

module.exports = router;
