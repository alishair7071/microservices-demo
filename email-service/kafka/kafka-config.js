const { Kafka } = require('kafkajs');

const topic = 'payment-events';
const groupId = 'email-service-group';
const kafka = new Kafka({
  clientId: 'email-service',
  brokers: ['kafka:9092'],
  retry: { retries: 10 }
});

module.exports = { kafka, topic, groupId };
