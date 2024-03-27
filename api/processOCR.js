require('dotenv').config();
const express = require('express');
const { convertOCRTextToJSON } = require('../utilities/textExtraction');
const { replyToLine } = require('../src/handlers/eventHandler');

const app = express();

app.use(express.json({ verify: (req, _, buf) => req.rawBody = buf }));

app.post('/processOCR', async (req, res) => {
  try {
    const { textResult, event, userName } = req.body;
    const jsonResultString = await convertOCRTextToJSON(textResult);
    const jsonResult = JSON.parse(jsonResultString);

    const nameMappings = {
      'Yuki Ikeda': 'YUKI',
      '五十嵐   陽唯': 'HARUI',
      'こう': 'KOH'
    };
    const userReName = nameMappings[userName] || userName;
    jsonResult['ユーザー名'] = userName;
    jsonResult['変更ユーザー名'] = userReName;

    await replyToLine(event, jsonResult);

    res.status(200).json({ message: 'OCR processing and line reply completed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = app;
