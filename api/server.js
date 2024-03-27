require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const { handleImageMessage } = require('../src/handlers/eventHandler');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const app = express();

app.use(express.json({ verify: (req, _, buf) => req.rawBody = buf }));
app.use(express.urlencoded({ extended: true }));

app.post('/webhook', line.middleware(config), (req, res) => {
  const start = new Date();
  console.log(`Webhook handling start: ${start.toISOString()}`);

  Promise.all(req.body.events.map(handleImageMessage))
    .then(() => {
      const end = new Date();
      console.log(`Webhook handling end: ${end.toISOString()}`);
      console.log(`Duration: ${end - start}ms`);
      res.status(200).end();
    })
    .catch((err) => {
      const end = new Date();
      console.error(`Error during webhook handling: ${err}`);
      console.log(`Webhook handling end with error: ${end.toISOString()}`);
      console.log(`Duration: ${end - start}ms`);
      res.status(500).end();
    });
});

const port = process.env.PORT || 3000;
(process.env.NOW_REGION) ? module.exports = app : app.listen(port);
console.log(`Server running at ${port}`);
