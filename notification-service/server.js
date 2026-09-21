const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');

const app = express();
app.use(cors());
app.use(express.json());

const notifications = [];

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5673';
const EXCHANGE_NAME = 'microservices.events';
const QUEUE_NAME = 'notification-service-queue';
const ROUTING_KEY = 'order.created';

async function consumeEvents() {
  let connection;

  while (true) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      connection.on('error', (error) => console.error('RabbitMQ connection error:', error.message));
      connection.on('close', () => console.log('RabbitMQ connection closed, reconnecting...'));

      const channel = await connection.createChannel();
      await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
      await channel.assertQueue(QUEUE_NAME, { durable: true });
      await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

      console.log(`Notification service consuming from ${QUEUE_NAME}`);

      channel.consume(
        QUEUE_NAME,
        async (message) => {
          if (!message) return;

          try {
            const event = JSON.parse(message.content.toString());

            // Create an in-app notification.
            console.log(`Notification created for order ${event.orderId}`);

            notifications.push({
              userName: event.userName,
              orderId: event.orderId,
              message: `Your order #${event.orderId} has been created successfully.`,
              createdAt: new Date().toISOString()
            });

            channel.ack(message);
          } catch (error) {
            console.error('Failed to process OrderCreated event:', error.message);
            channel.nack(message, false, false);
          }
        },
        { noAck: false }
      );

      return;
    } catch (error) {
      console.error('Could not connect to RabbitMQ, retrying in 5 seconds:', error.message);
      if (connection) await connection.close().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

app.get('/notifications', (_req, res) => {
  res.json(notifications);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

async function start() {
  app.listen(process.env.PORT || 4004, () => console.log('Notification service listening'));
  consumeEvents();
}

start().catch((error) => { console.error(error); process.exit(1); });
