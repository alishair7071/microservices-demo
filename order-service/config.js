module.exports = {
  port: 4000,
  mongoUri: 'mongodb://mongo:27017/order_db',
  inventoryUrl: 'http://inventory-service:4001',
  paymentUrl: 'http://payment-service:4002',
  inventoryGrpcAddress: 'inventory-service:50051',
  rabbitmqUrl: 'amqp://admin:admin@rabbitmq:5672'
};
