const { Kafka } = require('kafkajs');

const topic = 'payment-events';
const kafka = new Kafka({
  clientId: 'payment-service',
  brokers: ['kafka:9092'],
  retry: { retries: 10 }
});

module.exports = { kafka, topic };
