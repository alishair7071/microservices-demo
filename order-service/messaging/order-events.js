const amqp = require('amqplib');
const { rabbitmqUrl } = require('../config');

const exchangeName = 'microservices.events';
const routingKey = 'order.created';

async function publishOrderCreated(order) {
  let connection;

  while (true) {
    try {
      connection = await amqp.connect(rabbitmqUrl);
      connection.on('error', (error) => console.error('RabbitMQ connection error:', error.message));
      connection.on('close', () => console.log('RabbitMQ connection closed'));

      const channel = await connection.createConfirmChannel();
      await channel.assertExchange(exchangeName, 'topic', { durable: true });

      const event = {
        eventType: 'OrderCreated',
        orderId: order._id.toString(),
        userEmail: `${order.customerName.toLowerCase().replace(' ', '')}@example.com`,
        userName: order.customerName,
        productId: order.productId,
        quantity: order.quantity
      };

      channel.publish(
        exchangeName,
        routingKey,
        Buffer.from(JSON.stringify(event)),
        { persistent: true }
      );
      await channel.waitForConfirms();

      console.log(`Published OrderCreated event for order ${order._id}`);
      await connection.close();
      return;
    } catch (error) {
      console.error('Failed to publish OrderCreated event:', error.message);
      if (connection) await connection.close().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

module.exports = { publishOrderCreated };
