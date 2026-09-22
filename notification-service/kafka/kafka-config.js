const { Kafka } = require('kafkajs');

const topic = 'payment-events';
const groupId = 'notification-service-group';
const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: ['kafka:9092'],
  retry: { retries: 10 }
});

module.exports = { kafka, topic, groupId };
