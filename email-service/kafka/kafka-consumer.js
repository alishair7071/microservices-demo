const { kafka, topic, groupId } = require('./kafka-config');

async function startKafkaConsumer(kafkaEmails, instanceName) {
  const consumer = kafka.consumer({ groupId });

  while (true) {
    try {
      console.log(`${instanceName} connecting to Kafka...`);
      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: true });
      console.log(`${instanceName} subscribed to ${topic} as ${groupId}`);

      await consumer.run({
        eachMessage: async ({ message }) => {
          const event = JSON.parse(message.value.toString());
          if (event.type !== 'PaymentApproved') return;

          console.log(`${instanceName} received PaymentApproved for order ${event.orderId}`);
          kafkaEmails.push({
            to: event.userEmail || 'email not provided',
            subject: 'Payment Approved',
            orderId: event.orderId,
            paymentId: event.paymentId,
            amount: event.amount,
            customerName: event.customerName,
            productName: event.productName,
            quantity: event.quantity,
            message: 'Your payment has been approved',
            consumedBy: instanceName,
            eventCreatedAt: event.createdAt,
            consumedAt: new Date().toISOString()
          });
        }
      });
      return;
    } catch (error) {
      console.error(`${instanceName} Kafka consumer failed, retrying in 5 seconds:`, error.message);
      await consumer.disconnect().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

module.exports = { startKafkaConsumer };
