require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
// const { handleTextMessage } = require('../src/handlers/eventHandler');
const { handleImageMessage } = require('../src/handlers/eventHandler');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const app = express();

app.use(express.json({ verify: (req, _, buf) => req.rawBody = buf }));
app.use(express.urlencoded({ extended: true }));

app.post('/webhook', line.middleware(config), (req, res) => {
  const events = req.body.events;

  Promise.all(events.map(event => {
    if (event.message.type === 'image') { 
      return handleImageMessage(event);
    }
  }))
    .then(() => {
      res.status(200).end();
    })
    .catch((err) => {
      console.error(`Error during webhook handling: ${err}`);
      res.status(500).end();
    });
});

const port = process.env.PORT || 3000;
(process.env.NOW_REGION) ? module.exports = app : app.listen(port);
console.log(`Server running at ${port}`);
