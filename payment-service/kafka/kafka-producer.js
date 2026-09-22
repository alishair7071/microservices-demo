const { kafka, topic } = require('./kafka-config');

const producer = kafka.producer();
const admin = kafka.admin();
let connected = false;
let connectionPromise;

async function connectKafka() {
  if (connected) return;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    while (!connected) {
      try {
        console.log('Connecting to Kafka...');
        await admin.connect();
        try {
          await admin.createTopics({
            topics: [{ topic, numPartitions: 2, replicationFactor: 1 }],
            waitForLeaders: true
          });
        } catch (error) {
          if (error.type !== 'TOPIC_ALREADY_EXISTS') throw error;
        }
        await admin.disconnect();
        await producer.connect();
        connected = true;
        console.log('Kafka producer connected');
      } catch (error) {
        console.error('Kafka producer connection failed, retrying in 5 seconds:', error.message);
        await admin.disconnect().catch(() => {});
        await producer.disconnect().catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  })();

  try {
    await connectionPromise;
  } finally {
    connectionPromise = undefined;
  }
}

async function publishPaymentApproved(payment, orderDetails) {
  if (!connected) await connectKafka();

  const event = {
    type: 'PaymentApproved',
    paymentId: payment.transactionId,
    orderId: payment.orderId,
    userEmail: orderDetails.userEmail,
    customerName: orderDetails.customerName,
    productName: orderDetails.productName,
    quantity: orderDetails.quantity,
    amount: payment.amount,
    createdAt: new Date().toISOString()
  };

  await producer.send({
    topic,
    messages: [{
      key: payment.orderId,
      value: JSON.stringify(event)
    }]
  });

  console.log(`Published PaymentApproved event for order ${payment.orderId}`);
}

module.exports = { connectKafka, publishPaymentApproved };
