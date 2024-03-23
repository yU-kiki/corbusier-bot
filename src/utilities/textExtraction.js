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
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-0613",
    messages: [
      {
        role: "system",
        content:
          `以下の[テキスト]を[制約]に従って[出力フォーマット](json形式)で出力してください。[制約]* 出力は[出力フォーマット]のみ出力してください。日時はYYYY/MM/DDで表示してください。項目は["食費", "生活費", "その他"]のうち適切な一つを選んでください* [出力フォーマット]以外の余計な文章は出力しないでください。[出力フォーマット]{ "店名": "〇〇スーパー", "日時": "YYYY/MM/DD", "項目": "テキスト", "明細": [{  "商品名": "テスト",  "金額": 1000}],"合計金額": 10000}`
      },
      { role: "user", content: content },
    ],
  });

  const answerOpenAI = await response.choices[0].message?.content;
  return answerOpenAI;
}

module.exports = {
  readTextFromBuffer,
  extractTextArrayFromReadResults,
  isReceipt,
  convertOCRTextToJSON
};