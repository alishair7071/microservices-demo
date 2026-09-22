const { kafka, topic, groupId } = require('./kafka-config');

async function startKafkaConsumer(kafkaNotifications) {
  const consumer = kafka.consumer({ groupId });

  while (true) {
    try {
      console.log('Notification service connecting to Kafka...');
      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: true });
      console.log(`Notification service subscribed to ${topic} as ${groupId}`);

      await consumer.run({
        eachMessage: async ({ message }) => {
          const event = JSON.parse(message.value.toString());
          if (event.type !== 'PaymentApproved') return;

          console.log(`Notification service received PaymentApproved for order ${event.orderId}`);
          kafkaNotifications.push({
            orderId: event.orderId,
            paymentId: event.paymentId,
            amount: event.amount,
            customerName: event.customerName,
            productName: event.productName,
            quantity: event.quantity,
            message: 'Payment approved for your order',
            consumedBy: 'notification-service',
            eventCreatedAt: event.createdAt,
            consumedAt: new Date().toISOString()
          });
        }
      });
      return;
    } catch (error) {
      console.error('Notification Kafka consumer failed, retrying in 5 seconds:', error.message);
      await consumer.disconnect().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

module.exports = { startKafkaConsumer };
