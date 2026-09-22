module.exports = {
  port: 4003,
  rabbitmqUrl: 'amqp://admin:admin@rabbitmq:5672',
  exchangeName: 'microservices.events',
  queueName: 'email-service-queue',
  routingKey: 'order.created'
};
