const express = require('express');
const { serviceJson } = require('../lib/http-client');

function createProductRoutes(inventoryUrl) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    try {
      const product = await serviceJson(`${inventoryUrl}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      res.status(201).json(product);
    } catch (error) {
      res.status(502).json({ error: `Inventory service error: ${error.message}` });
    }
  });

  router.get('/', async (_req, res) => {
    try {
      res.json(await serviceJson(`${inventoryUrl}/products`));
    } catch (error) {
      res.status(502).json({ error: `Inventory service error: ${error.message}` });
    }
  });

  return router;
}

module.exports = createProductRoutes;
