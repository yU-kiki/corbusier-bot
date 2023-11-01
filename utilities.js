"use strict";

require("dotenv").config();
const { OpenAI } = require("openai");
const sleep = require("util").promisify(setTimeout);
const ComputerVisionClient = require("@azure/cognitiveservices-computervision").ComputerVisionClient;
const ApiKeyCredentials = require("@azure/ms-rest-js").ApiKeyCredentials;

const computerVisionKey = process.env.COMPUTER_VISION_KEY;
const computerVisionEndpoint = process.env.COMPUTER_VISION_ENDPOINT;

const computerVisionClient = new ComputerVisionClient(
  new ApiKeyCredentials({
    inHeader: { "Ocp-Apim-Subscription-Key": computerVisionKey },
  }),
  computerVisionEndpoint
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

async function convertOCRTextToJSON(content) {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-0301",
    messages: [
      {
        role: "system",
        content:
          "以下の[テキスト]を[制約]に従って[出力フォーマット]で出力してください。[制約]* 出力は[出力フォーマット]のみ出力してください。* [出力フォーマット]以外の余計な文章は出力しないでください。[出力フォーマット]```json { '店名': '〇〇スーパー', '日時': 'YYYY/MM/DD', '明細': [{  '商品名': 'テスト',  '金額': 1000}],'合計金額': 10000} ``` [テキスト] "
      },
      { role: "user", content: content },
    ],
  });

  const answerOpenAI = await response.choices[0].message?.content;
  return answerOpenAI;
}

module.exports = {
  computerVisionClient,
  convertOCRTextToJSON,
  readTextFromBuffer,
  extractTextArrayFromReadResults
};
