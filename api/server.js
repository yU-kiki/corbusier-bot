require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const { computerVisionClient, readTextFromBuffer, extractTextArrayFromReadResults, isReceipt, convertOCRTextToJSON } = require('../utilities');
const { saveToSpreadSheet } = require('../spreadsheetService');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const app = express();

app.use(express.json({ verify: (req, _, buf) => req.rawBody = buf }));
app.use(express.urlencoded({ extended: true }));

const client = new line.Client(config);

async function writeToSheet(jsonResult) {
  const result = await saveToSpreadSheet(jsonResult);
  if (result.status !== 200) {
    throw new Error(result.message);
  }
}

async function getUserName(event) {
  let name = "匿名ユーザー";

  if (event.source.type === 'user') {
    const userProfile = await client.getProfile(event.source.userId);
    name = userProfile.displayName;
  }
  else if (event.source.type === 'group') {
    try {
      const groupMemberProfile = await client.getGroupMemberProfile(event.source.groupId, event.source.userId);
      name = groupMemberProfile.displayName;
    } catch (error) {
      console.error(`Cannot get group member profile: ${error}`);
    }
  }
  else if (event.source.type === 'room') {
    try {
      const roomMemberProfile = await client.getRoomMemberProfile(event.source.roomId, event.source.userId);
      name = roomMemberProfile.displayName;
    } catch (error) {
      console.error(`Cannot get room member profile: ${error}`);
    }
  }

  return name;
}


async function replyToLine(event, jsonResult) {
  await writeToSheet(jsonResult);

  const mentionText = `@${jsonResult['ユーザー名']}`;
  const replyMessage = `${mentionText}\n` +
    `以下の内容で登録しました。\n` +
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

async function fetchImageContent(event) {
  const stream = await client.getMessageContent(event.message.id);
  const buffers = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => buffers.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(buffers)));
  });
}

async function handleImageMessage(event) {
  try {
    const buffer = await fetchImageContent(event);

    const readResults = await readTextFromBuffer(computerVisionClient, buffer);
    const textArray = await extractTextArrayFromReadResults(readResults);
    const textResult = textArray.join('\n');
    if (!isReceipt(textResult)) {
      throw new Error('レシートとしての特徴が不足しています。');
    }

    const jsonResultString = await convertOCRTextToJSON(textResult);
    const jsonResult = JSON.parse(jsonResultString);
    const userName = await getUserName(event);
    const nameMappings = {
      'Yuki Ikeda': 'YUKI',
      '五十嵐   陽唯': 'HARUI',
      'こう': 'KOH'
    };
    const userReName = nameMappings[userName] || userName;
    jsonResult['ユーザー名'] = userName;
    jsonResult['変更ユーザー名'] = userReName;
    await replyToLine(event, jsonResult);
  } catch (err) {
    console.error(`画像メッセージの処理中にエラーが発生しました: ${err.message}`);
  }
}


app.post('/webhook', line.middleware(config), (req, res) => {
  console.log('Received request on /webhook.');
  Promise.all(req.body.events.map(handleImageMessage))
    .then(() => res.status(200).end())
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

const port = process.env.PORT || 3000;
// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });
(process.env.NOW_REGION) ? module.exports = app : app.listen(port);
console.log(`Server running at ${port}`);