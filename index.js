require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const { computerVisionClient, convertOCRTextToJSON, readTextFromBuffer, extractTextArrayFromReadResults } = require('./utilities');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const app = express();

app.use(express.json({ verify: (req, _, buf) => req.rawBody = buf }));
app.use(express.urlencoded({ extended: true }));

const client = new line.Client(config);

async function handleImageMessage(event) {
  try {
    const stream = await client.getMessageContent(event.message.id);

    const buffers = [];
    stream.on('data', (chunk) => buffers.push(chunk));
    stream.on('error', (err) => {
      throw new Error(err);
    });

    const buffer = await new Promise((resolve, reject) => {
      stream.on('end', () => resolve(Buffer.concat(buffers)));
      stream.on('error', (err) => reject(err));
    });

    const readResults = await readTextFromBuffer(computerVisionClient, buffer);
    const textArray = await extractTextArrayFromReadResults(readResults);
    const textResult = textArray.join('\n');

    const jsonResult = await convertOCRTextToJSON(textResult);
    console.log(jsonResult);

    // 応答をLINEに送信するなどの処理をここに追加
    // ...

  } catch (err) {
    console.error(err);
  }
}

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleImageMessage))
    .then(() => res.status(200).end())
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
