"use strict";

const sleep = require("util").promisify(setTimeout);
const { openai } = require("./openAIIntegration");

async function readTextFromBuffer(client, buffer) {
  let result = await client.readInStream(buffer);
  let operation = result.operationLocation.split('/').slice(-1)[0];

  while (true) {
    await sleep(1000);
    result = await client.getReadResult(operation);
    if (result.status === 'succeeded') {
      break;
    }
  }
  return result.analyzeResult.readResults;
}

async function extractTextArrayFromReadResults(readResults) {
  const array = [];
  for (const page of readResults) {
    if (page.lines) {
      for (const line of page.lines) {
        array.push(line.text);
      }
    }
  }
  return array;
}

function isReceipt(textResult) {
  const keywords = [
    'レシート', '領収書', '合計', '税込', 'お釣り', '現金', 'クレジットカード', '購入日', '販売'
  ];
  const timePattern = /\b([01]?\d|2[0-3]):([0-5]?\d)\b/;

  const containsKeywords = keywords.some(keyword => textResult.includes(keyword));
  const containsTime = timePattern.test(textResult);

  return containsKeywords && containsTime;
}

async function convertOCRTextToJSON(content) {
  const messages = [
    { "role": "system", "content": `あなたは返答をすべてJSON形式で出力します。出力フォーマットは { "店名": "...", "日時": "YYYY / MM / DD", "項目": ["食費", "生活費", "その他"]（どれか1つ） "明細": [{ "商品名": "...", "金額": "..." }]（３つ）, "合計金額": "..." } です。`},
    { "role": "user", "content": content },
  ]
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-0613",
    messages: messages,
    response_format: { "type": "json_object" },
    temperature: 0,
  })

  const answerOpenAI = await response.choices[0].message?.content;
  console.log(answerOpenAI);
  return answerOpenAI;
}

module.exports = {
  readTextFromBuffer,
  extractTextArrayFromReadResults,
  isReceipt,
  convertOCRTextToJSON
};