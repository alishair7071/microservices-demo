module.exports = {
  port: 4004,
  rabbitmqUrl: 'amqp://admin:admin@rabbitmq:5672',
  exchangeName: 'microservices.events',
  queueName: 'notification-service-queue',
  routingKey: 'order.created'
};
