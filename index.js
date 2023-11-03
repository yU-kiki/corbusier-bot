require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const line = require('@line/bot-sdk');
const { computerVisionClient, convertOCRTextToJSON, readTextFromBuffer, extractTextArrayFromReadResults } = require('./utilities');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const spreadsheetId = process.env.SPREADSHEET_ID;
const sheetName = '履歴テスト';

const app = express();

app.use(express.json({ verify: (req, _, buf) => req.rawBody = buf }));
app.use(express.urlencoded({ extended: true }));

const client = new line.Client(config);

const auth = new google.auth.GoogleAuth({
  keyFile: keyFilePath,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const googleSheetsInstance = google.sheets({ version: 'v4', auth });

async function writeToSheet(jsonResult) {
  const authClient = await auth.getClient();

  const getRows = await googleSheetsInstance.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!B:B`,
  });

  const firstEmptyRow = getRows.data.values ? getRows.data.values.length + 1 : 1;

  await googleSheetsInstance.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!B${firstEmptyRow}:G${firstEmptyRow}`,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [
        [
          jsonResult['日時'],
          `=if(${sheetName}!B${firstEmptyRow}="","", MONTH(${sheetName}!B${firstEmptyRow}))`, // 月
          'LINE送信者の名前',
          jsonResult['合計金額'],
          jsonResult['項目'],
          `${jsonResult['明細'].slice(0, 3).map(item => item['商品名']).join('、')}など`, // 内容
        ],
      ],
    },
  });
}

async function replyToLine(event, jsonResult) {
  await writeToSheet(jsonResult);
  const replyMessage = `以下の内容で登録しました。\n` +
    `【店名】${jsonResult['店名']}\n` +
    `【日時】${jsonResult['日時']}\n` +
    `【金額】${jsonResult['合計金額']}円\n` +
    `【項目】${jsonResult['項目']}\n` +
    `【内容】${jsonResult['明細'].slice(0, 3).map(item => item['商品名']).join('、')} など`;

  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyMessage
  });
}

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

    const jsonResultString = await convertOCRTextToJSON(textResult);
    try {
      const jsonResult = JSON.parse(jsonResultString);
      await replyToLine(event, jsonResult);
    } catch (e) {
      console.error("JSON解析エラー:", e);
    }
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
