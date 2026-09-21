const express = require('express');
const cors = require('cors');
const amqp = require('amqplib');

const app = express();
app.use(cors());
app.use(express.json());

const sentEmails = [];

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5673';
const EXCHANGE_NAME = 'microservices.events';
const QUEUE_NAME = 'email-service-queue';
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

      console.log(`Email service consuming from ${QUEUE_NAME}`);

      channel.consume(
        QUEUE_NAME,
        async (message) => {
          if (!message) return;

          try {
            const event = JSON.parse(message.content.toString());

            // Simulate sending an email (no external provider).
            console.log(`Email sent to ${event.userEmail} for order ${event.orderId}`);

            sentEmails.push({
              to: event.userEmail,
              subject: 'Order Created',
              orderId: event.orderId,
              message: 'Your order has been created',
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

app.get('/emails', (_req, res) => {
  res.json(sentEmails);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'email-service' });
});

async function start() {
  app.listen(process.env.PORT || 4003, () => console.log('Email service listening'));
  consumeEvents();
}

start().catch((error) => { console.error(error); process.exit(1); });
