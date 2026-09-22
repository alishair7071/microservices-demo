const express = require('express');
const cors = require('cors');
const config = require('./config');
const createEmailRoutes = require('./routes/email-routes');
const { startEmailConsumer } = require('./messaging/email-consumer');

const app = express();
app.use(cors());
app.use(express.json());

const sentEmails = [];
let consumerReady = false;
const isReady = () => consumerReady;
const setReady = (value) => { consumerReady = value; };

app.use(createEmailRoutes(sentEmails, isReady));

async function start() {
  app.listen(config.port, () => console.log(`Email service listening on port ${config.port}`));
  startEmailConsumer(sentEmails, setReady);
}

start().catch((error) => { console.error(error); process.exit(1); });
