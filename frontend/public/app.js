// URLs exposed by Docker Compose on your computer.
const orderApi = 'http://localhost:4000';
const inventoryApi = 'http://localhost:4001';
const emailServiceAApi = 'http://localhost:4003';
const emailServiceBApi = 'http://localhost:4005';
const notificationApi = 'http://localhost:4004';

// HTML elements we update from JavaScript.
const productsList = document.querySelector('#products');
const productSelect = document.querySelector('#product-id');
const ordersList = document.querySelector('#orders');
const message = document.querySelector('#message');

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function emptyState(text) {
  return `<div class="empty">${escapeHtml(text)}</div>`;
}

function updateMetric(id, value) {
  document.querySelector(`#${id}`).textContent = value;
}

function displayValue(value) {
  return value === undefined || value === null || value === '' ? '—' : escapeHtml(value);
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return escapeHtml(timestamp);
  return date.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

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

  updateMetric('product-count', products.length);
  updateMetric('stock-count', products.reduce((total, product) => total + product.stock, 0));

  productsList.innerHTML = products.length
    ? products.map((product) => `
        <div class="product-item">
          <div><div class="item-title">${escapeHtml(product.name)}</div><div class="item-meta">Inventory service / REST</div></div>
          <div class="item-actions"><span class="stock ${product.stock < 5 ? 'low' : ''}">${product.stock} in stock</span><button class="delete" type="button" data-delete-product="${escapeHtml(product._id)}">Delete</button></div>
        </div>
      `).join('')
    : emptyState('No products yet. Add the first item above.');

  productSelect.innerHTML = products
    .map((product) => `<option value="${escapeHtml(product._id)}" ${product.stock === 0 ? 'disabled' : ''}>${escapeHtml(product.name)} (${product.stock} available)</option>`).join('');
}

// Fetch all sent emails from email-service and render them.
// We fetch from the Docker host because the frontend runs in its own container.
function renderEmails(emails, instanceName) {
  return emails.length
    ? emails.slice().reverse().map((email) => `
        <div class="event-item">
          <span class="event-mark mail">@</span>
          <div class="event-copy">
            <div class="item-title">Email sent to ${escapeHtml(email.to)}</div>
            <div class="item-meta">Subject: ${escapeHtml(email.subject)} / order: ${escapeHtml(email.orderId)}</div>
            <div class="item-meta">Consumed by: ${escapeHtml(email.consumedBy || instanceName)} / ${escapeHtml(email.createdAt)}</div>
          </div>
        </div>
      `).join('')
    : emptyState(`No emails consumed by ${instanceName} yet.`);
}

function renderKafkaEmails(emails, instanceName) {
  return emails.length
    ? emails.slice().reverse().map((email) => `
        <div class="event-item kafka-event">
          <span class="event-mark mail">K</span>
          <div class="event-copy">
            <div class="item-title">Payment approved for ${displayValue(email.customerName)}</div>
            <div class="item-meta">Email: ${displayValue(email.to)} · Product: ${displayValue(email.productName)} × ${displayValue(email.quantity)}</div>
            <div class="event-details">
              <span><b>Amount</b>${displayValue(email.amount)}</span>
              <span><b>Event created</b>${formatTimestamp(email.eventCreatedAt)}</span>
              <span><b>Consumed</b>${formatTimestamp(email.consumedAt || email.createdAt)}</span>
              <span><b>Consumer</b>${displayValue(email.consumedBy || instanceName)}</span>
            </div>
            <div class="item-meta event-id">Order: ${displayValue(email.orderId)} · Payment: ${displayValue(email.paymentId)}</div>
          </div>
        </div>
      `).join('')
    : emptyState(`No Kafka events consumed by ${instanceName} yet.`);
}

function renderKafkaNotifications(notifications) {
  return notifications.length
    ? notifications.slice().reverse().map((notification) => `
        <div class="event-item kafka-event">
          <span class="event-mark">K</span>
          <div class="event-copy">
            <div class="item-title">Payment approved for ${displayValue(notification.customerName)}</div>
            <div class="item-meta">Product: ${displayValue(notification.productName)} × ${displayValue(notification.quantity)}</div>
            <div class="event-details">
              <span><b>Amount</b>${displayValue(notification.amount)}</span>
              <span><b>Event created</b>${formatTimestamp(notification.eventCreatedAt)}</span>
              <span><b>Consumed</b>${formatTimestamp(notification.consumedAt || notification.createdAt)}</span>
              <span><b>Consumer</b>${displayValue(notification.consumedBy)}</span>
            </div>
            <div class="item-meta event-id">Order: ${displayValue(notification.orderId)} · Payment: ${displayValue(notification.paymentId)}</div>
          </div>
        </div>
      `).join('')
    : emptyState('No Kafka notifications received yet.');
}

async function loadEmailInstance(api, elementId, instanceName) {
  const response = await fetch(`${api}/emails`);
  const emails = await response.json();

  if (!response.ok) throw new Error(emails.error || `Could not fetch ${instanceName} emails`);
  document.querySelector(`#${elementId}`).innerHTML = renderEmails(emails, instanceName);
  return emails.length;
}

// Fetch both local in-memory email lists. RabbitMQ decides which instance receives each message.
async function loadEmails() {
  try {
    const [emailCountA, emailCountB] = await Promise.all([
      loadEmailInstance(emailServiceAApi, 'emails-a', 'email-service-A'),
      loadEmailInstance(emailServiceBApi, 'emails-b', 'email-service-B')
    ]);

    currentEmailCount = emailCountA + emailCountB;
    updateMetric('event-count', currentEmailCount + currentNotificationCount + currentKafkaEmailCount + currentKafkaNotificationCount);
  } catch (error) {
    console.error('Could not fetch emails:', error);
  }
}

async function loadKafkaEmails() {
  try {
    const [responseA, responseB] = await Promise.all([
      fetch(`${emailServiceAApi}/kafka/emails`),
      fetch(`${emailServiceBApi}/kafka/emails`)
    ]);
    const [dataA, dataB] = await Promise.all([responseA.json(), responseB.json()]);
    if (!responseA.ok || !responseB.ok) throw new Error('Could not fetch Kafka email events');

    document.querySelector('#kafka-emails-a').innerHTML = renderKafkaEmails(dataA.emails, 'email-service-A');
    document.querySelector('#kafka-emails-b').innerHTML = renderKafkaEmails(dataB.emails, 'email-service-B');
    currentKafkaEmailCount = dataA.emails.length + dataB.emails.length;
    updateMetric('event-count', currentEmailCount + currentNotificationCount + currentKafkaEmailCount + currentKafkaNotificationCount);
  } catch (error) {
    console.error('Could not fetch Kafka emails:', error);
  }
}

// Fetch all notifications from notification-service and render them.
async function loadNotifications() {
  try {
    const response = await fetch(`${notificationApi}/notifications`);
    const notifications = await response.json();

    currentNotificationCount = notifications.length;
    updateMetric('event-count', currentEmailCount + currentNotificationCount + currentKafkaEmailCount + currentKafkaNotificationCount);
    const notificationsHtml = notifications.length
      ? notifications.slice().reverse().map((n) => `
        <div class="event-item">
          <span class="event-mark">!</span>
          <div class="event-copy"><div class="item-title">Notification for ${escapeHtml(n.userName)}</div><div class="item-meta">${escapeHtml(n.message)}</div></div>
        </div>
      `).join('')
      : emptyState('No notification events received yet.');

    document.querySelector('#notifications').innerHTML = notificationsHtml;
  } catch (error) {
    console.error('Could not fetch notifications:', error);
  }
}

async function loadKafkaNotifications() {
  try {
    const response = await fetch(`${notificationApi}/kafka/notifications`);
    const data = await response.json();
    if (!response.ok) throw new Error('Could not fetch Kafka notifications');

    document.querySelector('#kafka-notifications').innerHTML = renderKafkaNotifications(data.notifications);
    currentKafkaNotificationCount = data.notifications.length;
    updateMetric('event-count', currentEmailCount + currentNotificationCount + currentKafkaEmailCount + currentKafkaNotificationCount);
  } catch (error) {
    console.error('Could not fetch Kafka notifications:', error);
  }
}

let currentEmailCount = 0;
let currentNotificationCount = 0;
let currentKafkaEmailCount = 0;
let currentKafkaNotificationCount = 0;

// Fetch all saved orders from order-service and render them.
// A Pay button is shown only while an order is waiting for payment.
async function loadOrders() {
  const orders = await orderRequest('/orders');

  updateMetric('order-count', orders.length);
  ordersList.innerHTML = orders.length ? orders.map((order) => {
      const payButton = order.status === 'pending_payment'
        ? `<button class="pay" data-pay-id="${escapeHtml(order._id)}">Pay</button>`
        : '';

      return `<div class="order-item"><div><div class="item-title">${escapeHtml(order.productName)} <span class="item-meta">x ${order.quantity}</span></div><div class="item-meta">For ${escapeHtml(order.customerName)} / ${escapeHtml(order._id)}</div></div><div class="item-actions">${payButton}<span class="status ${escapeHtml(order.status)}">${escapeHtml(order.status.replace('_', ' '))}</span><button class="delete" type="button" data-delete-order="${escapeHtml(order._id)}">Delete</button></div></div>`;
    }).join('') : emptyState('No orders yet. Create one to start the flow.');
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

productsList.addEventListener('click', async (event) => {
  const productId = event.target.closest('[data-delete-product]')?.dataset.deleteProduct;
  if (!productId || !window.confirm('Delete this product?')) return;

  try {
    const response = await fetch(`${inventoryApi}/products/${productId}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not delete product');
    showMessage('Product deleted.');
    await loadProducts();
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
    customerName: form.get('customerName'),
    userEmail: form.get('userEmail')
  };

  try {
    const order = await orderRequest('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder)
    });

    event.target.reset();
    showMessage(`Order ${order._id} created. Click Pay when ready.`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await Promise.all([loadProducts(), loadOrders(), loadEmails(), loadNotifications(), loadKafkaEmails(), loadKafkaNotifications()]);
  } catch (error) {
    showMessage(error.message, true);
  }
});

// Use one click listener for every current/future Pay button in the order list.
ordersList.addEventListener('click', async (event) => {
  const orderId = event.target.closest('[data-pay-id]')?.dataset.payId;
  const deleteOrderId = event.target.closest('[data-delete-order]')?.dataset.deleteOrder;

  if (deleteOrderId) {
    if (!window.confirm('Delete this order?')) return;

    try {
      const result = await orderRequest(`/orders/${deleteOrderId}`, { method: 'DELETE' });
      showMessage(result.success ? 'Order deleted.' : 'Could not delete order.', !result.success);
      await loadOrders();
    } catch (error) {
      showMessage(error.message, true);
    }
    return;
  }

  // Ignore clicks that were not on a Pay button.
  if (!orderId) return;

  try {
    const result = await orderRequest(`/orders/${orderId}/pay`, {
      method: 'POST'
    });

    showMessage(`Payment successful. Transaction: ${result.transactionId}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await Promise.all([loadOrders(), loadEmails(), loadNotifications(), loadKafkaEmails(), loadKafkaNotifications()]);
  } catch (error) {
    showMessage(error.message, true);
  }
});

// Refresh button and initial page load.
document.querySelector('#refresh-orders').addEventListener('click', loadOrders);

Promise.all([loadProducts(), loadOrders(), loadEmails(), loadNotifications(), loadKafkaEmails(), loadKafkaNotifications()])
  .catch((error) => showMessage(error.message, true));
