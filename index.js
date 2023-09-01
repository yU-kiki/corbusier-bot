"use strict";

require("dotenv").config();
const { OpenAI } = require("openai");
const sleep = require("util").promisify(setTimeout);
const ComputerVisionClient =
  require("@azure/cognitiveservices-computervision").ComputerVisionClient;
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


// 読み取りを実行し、URLからテキストを読み取る関数
async function readTextFromURL(client, url) {
  let result = await client.read(url);
  let operation = result.operationLocation.split("/").slice(-1)[0];

  while (result.status !== "succeeded") {
    await sleep(1000);
    result = await client.getReadResult(operation);
  }
  return result.analyzeResult.readResults;
}

// ページの読み取り結果を抽出し、テキストを配列に格納する関数
async function extractTextArrayFromReadResults(readResults) {
  const array = [];
  for (const page in readResults) {
    const result = readResults[page];
    if (result.lines.length) {
      for (const line of result.lines) {
        array.push(line.text);
      }
    } else {
      console.log("No recognized text.");
    }
  }
  return array;
}

// テキストをJSON形式に変換する関数
async function convertOCRTextToJSON(content) {
  // OpenAI APIを使用
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-0301",
    messages: [
      {
        role: "system",
        content:
          "以下の[テキスト]を[制約]に従って[出力フォーマット]で出力してください。[制約]* 出力は[出力フォーマット]のみ出力してください。* [出力フォーマット]以外の余計な文章は出力しないでください。[出力フォーマット]```json { '明細': [{  '商品名': 'テスト',  '金額': 1000}],'合計金額': 10000} ``` [テキスト] ",
      },
      { role: "user", content: content },
    ],
  });

  const answerOpenAI = await response.choices[0].message?.content;
  return answerOpenAI;
}

// OCR APIを利用して画像のURLからテキストを抽出し、テキストデータをopenAIに渡してJSON形式に変換する
async function convertImageToJSON() {
  const printedTextSampleURL = process.argv[2];

  // Computer Vision APIを使用して、画像のURLからテキストを認識
  const printedResult = await readTextFromURL(
    computerVisionClient,
    printedTextSampleURL
  );
  const extractTextArray = await extractTextArrayFromReadResults(printedResult);
  const parsedData = await convertOCRTextToJSON(extractTextArray.join("\n"));
  console.log(parsedData);
}

convertImageToJSON();

