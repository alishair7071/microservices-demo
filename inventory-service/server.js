const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const Product = mongoose.model('Product', new mongoose.Schema({
  name: String,
  stock: Number
}));

// Load the shared contract used by order-service and inventory-service.
const packageDefinition = protoLoader.loadSync(
  path.join(__dirname, 'proto', 'inventory.proto'),
  { keepCase: true }
);
const inventoryGrpc = grpc.loadPackageDefinition(packageDefinition).inventory;

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

// This function is shared by the gRPC handler below. It is no longer a REST route.
async function reduceStock(productId, quantity) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { success: false, remaining_stock: 0 };
  }

  try {
    const product = await Product.findOneAndUpdate(
      { _id: productId, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { new: true }
    );

    if (!product) return { success: false, remaining_stock: 0 };
    return { success: true, remaining_stock: product.stock };
  } catch (error) {
    return { success: false, remaining_stock: 0 };
  }
}

// gRPC method called internally by order-service on port 50051.
async function reduceStockGrpc(call, callback) {
  const result = await reduceStock(
    call.request.product_id,
    call.request.quantity
  );
  callback(null, result);
}

function startGrpcServer() {
  const grpcServer = new grpc.Server();
  grpcServer.addService(inventoryGrpc.InventoryService.service, {
    ReduceStock: reduceStockGrpc
  });

  grpcServer.bindAsync(
    `0.0.0.0:${process.env.GRPC_PORT || 50051}`,
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
      if (error) throw error;
      grpcServer.start();
      console.log(`Inventory gRPC server listening on ${port}`);
    }
  );
}

async function start() {
  await mongoose.connect(process.env.MONGO_URI);
  await seedProducts();
  app.listen(process.env.PORT || 4001, () => console.log('Inventory service listening'));
  startGrpcServer();
}

start().catch((error) => { console.error(error); process.exit(1); });
