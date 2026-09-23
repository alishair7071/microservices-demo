const express = require('express');
const cors = require('cors');
const config = require('./config');
const createEmailRoutes = require('./routes/email-routes');
const { startEmailConsumer } = require('./messaging/email-consumer');
const { startKafkaConsumer } = require('./kafka/kafka-consumer');

const app = express();
app.use(cors());
app.use(express.json());

const sentEmails = [];
const kafkaEmails = [];
const instanceName = process.env.EMAIL_SERVICE_NAME || 'email-service';
const state = { ready: false };

app.use(createEmailRoutes(sentEmails, kafkaEmails, state, instanceName));

async function start() {
  app.listen(config.port, () => console.log(`Email service listening on port ${config.port}`));
  startEmailConsumer(sentEmails, state, instanceName);
  startKafkaConsumer(kafkaEmails, instanceName);
}

start().catch((error) => { console.error(error); process.exit(1); });
