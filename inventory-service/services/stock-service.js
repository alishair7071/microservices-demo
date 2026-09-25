const Product = require('../models/product');

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

async function restoreStock(productId, quantity) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { success: false, remaining_stock: 0 };
  }

  try {
    const product = await Product.findByIdAndUpdate(
      productId,
      { $inc: { stock: quantity } },
      { new: true }
    );

    if (!product) return { success: false, remaining_stock: 0 };
    return { success: true, remaining_stock: product.stock };
  } catch (error) {
    return { success: false, remaining_stock: 0 };
  }
}

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

module.exports = { reduceStock, restoreStock, seedProducts };
