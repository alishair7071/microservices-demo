const amqp = require('amqplib');
const config = require('../config');

async function startNotificationConsumer(notifications, setReady) {
  let connection;

  while (true) {
    try {
      connection = await amqp.connect(config.rabbitmqUrl);
      connection.on('error', (error) => console.error('RabbitMQ connection error:', error.message));
      connection.on('close', () => {
        setReady(false);
        console.log('RabbitMQ connection closed, reconnecting...');
      });

      const channel = await connection.createChannel();
      await channel.assertExchange(config.exchangeName, 'topic', { durable: true });
      await channel.assertQueue(config.queueName, { durable: true });
      await channel.bindQueue(config.queueName, config.exchangeName, config.routingKey);

      console.log(`Notification service consuming from ${config.queueName}`);
      channel.consume(config.queueName, (message) => {
        if (!message) return;
        try {
          const event = JSON.parse(message.content.toString());
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
      }, { noAck: false });

      setReady(true);
      return;
    } catch (error) {
      console.error('Could not connect to RabbitMQ, retrying in 5 seconds:', error.message);
      if (connection) await connection.close().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

module.exports = { startNotificationConsumer };
