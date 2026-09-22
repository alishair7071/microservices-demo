const express = require('express');
const cors = require('cors');
const config = require('./config');
const createNotificationRoutes = require('./routes/notification-routes');
const { startNotificationConsumer } = require('./messaging/notification-consumer');
const { startKafkaConsumer } = require('./kafka/kafka-consumer');

const app = express();
app.use(cors());
app.use(express.json());

const notifications = [];
const kafkaNotifications = [];
let consumerReady = false;
const isReady = () => consumerReady;
const setReady = (value) => { consumerReady = value; };

app.use(createNotificationRoutes(notifications, kafkaNotifications, isReady));

async function start() {
  app.listen(config.port, () => console.log(`Notification service listening on port ${config.port}`));
  startNotificationConsumer(notifications, setReady);
  startKafkaConsumer(kafkaNotifications);
}

start().catch((error) => { console.error(error); process.exit(1); });
