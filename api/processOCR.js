require('dotenv').config();
const express = require('express');
const { convertOCRTextToJSON } = require('../src/utilities/textExtraction');
const { replyToLine } = require('../src/handlers/eventHandler');

const app = express();

app.use(express.json({ verify: (req, _, buf) => req.rawBody = buf }));

app.post('/processOCR', async (req, res) => {
  console.log(`processOCR handling start: ${new Date().toISOString()}`);

  try {
    const { textResult, event, userName } = req.body;
    console.log('convertOCRTextToJSON\n');
    console.log(`start: ${new Date().toISOString()}`);
    const jsonResultString = await convertOCRTextToJSON(textResult);
    console.log(`end: ${new Date().toISOString()}`);
    console.log('JSON.parse')
    console.log(`start: ${new Date().toISOString()}`);
    const jsonResult = JSON.parse(jsonResultString);
    console.log(`end: ${new Date().toISOString()}`);

    const nameMappings = {
      'Yuki Ikeda': 'YUKI',
      '五十嵐   陽唯': 'HARUI',
      'こう': 'KOH'
    };
    const userReName = nameMappings[userName] || userName;
    jsonResult['ユーザー名'] = userName;
    jsonResult['変更ユーザー名'] = userReName;

    console.log('replyToLine]\n')
    console.log(`start: ${new Date().toISOString()}`);
    await replyToLine(event, jsonResult);
    console.log(`start: ${new Date().toISOString()}`);
    res.status(200).json({ message: 'OCR processing and line reply completed' });
  } catch (err) {
    console.error(`Error in Process OCR: ${err}`);
    console.log(`Process OCR end with error: ${new Date().toISOString()}`);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = app;
