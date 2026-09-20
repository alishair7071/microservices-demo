// URLs exposed by Docker Compose on your computer.
const orderApi = 'http://localhost:4000';
const inventoryApi = 'http://localhost:4001';

// HTML elements we update from JavaScript.
const productsList = document.querySelector('#products');
const productSelect = document.querySelector('#product-id');
const ordersList = document.querySelector('#orders');
const message = document.querySelector('#message');

// Show a green success message or a red error message below the order form.
function showMessage(text, isError = false) {
  message.textContent = text;
  message.className = isError ? 'message error' : 'message';
}

// Send a request to order-service and turn its JSON response into JavaScript data.
// Orders and payments use this service because it coordinates those operations.
async function orderRequest(path, options) {
  const response = await fetch(orderApi + path, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Fetch products directly from inventory-service.
// The product list is displayed and also used to fill the order dropdown.
async function loadProducts() {
  const response = await fetch(`${inventoryApi}/products`);
  const products = await response.json();

  if (!response.ok) {
    throw new Error(products.error || 'Could not fetch products');
  }

  productsList.innerHTML = products
    .map((product) => `<li>${product.name} — ${product.stock} in stock</li>`)
    .join('');

  productSelect.innerHTML = products
    .map((product) => (
      `<option value="${product._id}">${product.name} (${product.stock} available)</option>`
    ))
    .join('');
}

// Fetch all saved orders from order-service and render them.
// A Pay button is shown only while an order is waiting for payment.
async function loadOrders() {
  const orders = await orderRequest('/orders');

  ordersList.innerHTML = orders
    .map((order) => {
      const payButton = order.status === 'pending_payment'
        ? `<button data-pay-id="${order._id}">Pay</button>`
        : '';

      return `<li>${order.productName} × ${order.quantity} for ${order.customerName} — ${order.status} ${payButton}</li>`;
    })
    .join('');
}

// Add a product directly to inventory-service.
document.querySelector('#product-form').addEventListener('submit', async (event) => {
  event.preventDefault(); // Keep the page from reloading.

  const form = new FormData(event.target);
  const newProduct = {
    name: form.get('name'),
    stock: Number(form.get('stock'))
  };

  try {
    const response = await fetch(`${inventoryApi}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct)
    });
    const product = await response.json();

    if (!response.ok) {
      throw new Error(product.error || 'Could not create product');
    }

    event.target.reset();
    showMessage('Product added.');
    await loadProducts(); // Refresh stock list and order dropdown.
  } catch (error) {
    showMessage(error.message, true);
  }
});

// Create an order. This reduces inventory and saves an unpaid order.
document.querySelector('#order-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const form = new FormData(event.target);
  const newOrder = {
    productId: productSelect.value,
    quantity: Number(form.get('quantity')),
    customerName: form.get('customerName')
  };

  try {
    const order = await orderRequest('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder)
    });

    event.target.reset();
    showMessage(`Order ${order._id} created. Click Pay when ready.`);
    await Promise.all([loadProducts(), loadOrders()]);
  } catch (error) {
    showMessage(error.message, true);
  }
});

// Use one click listener for every current/future Pay button in the order list.
ordersList.addEventListener('click', async (event) => {
  const orderId = event.target.dataset.payId;

  // Ignore clicks that were not on a Pay button.
  if (!orderId) return;

  try {
    const result = await orderRequest(`/orders/${orderId}/pay`, {
      method: 'POST'
    });

    showMessage(`Payment successful. Transaction: ${result.transactionId}`);
    await loadOrders(); // The order now displays as paid.
  } catch (error) {
    showMessage(error.message, true);
  }
});

// Refresh button and initial page load.
document.querySelector('#refresh-orders').addEventListener('click', loadOrders);

Promise.all([loadProducts(), loadOrders()])
  .catch((error) => showMessage(error.message, true));
