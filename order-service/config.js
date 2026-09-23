module.exports = {
  port: 4000,
  mongoUri: 'mongodb://mongo:27017/order_db',
  inventoryGrpcAddress: 'inventory-service:50051',
  rabbitmqUrl: 'amqp://admin:admin@rabbitmq:5672'
};
