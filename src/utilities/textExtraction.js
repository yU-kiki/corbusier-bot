"use strict";

const sleep = require("util").promisify(setTimeout);
const { openai } = require("./openAIIntegration");
const moment = require("moment-timezone");

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
    { "role": "system", "content": `あなたは返答をすべてJSON形式で出力します。各項目の説明は以下の通りです。\n- "店名": 購入した店の名前\n- "日時": 購入日時 (YYYY/MM/DD 形式)\n- "項目": 購入したもののカテゴリー。"食費"、"生活費"、"その他"のうち1つを選んでください。\n- "明細": 購入した商品のリスト。各商品は {"商品名": "...", "金額": "..."} の形式で、最大3つまで。\n- "合計金額": 購入した商品の合計金額\n\n出力フォーマットは次の通りです。\n{ "店名": "...", "日時": "YYYY/MM/DD", "項目": "食費/生活費/その他", "明細": [{ "商品名": "...", "金額": "..." }], "合計金額": "..." }` },
    { "role": "user", "content": content },
  ]
  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: messages,
    response_format: { "type": "json_object" },
    temperature: 0,
  })

  const answerOpenAI = await response.choices[0].message?.content;
  return answerOpenAI;
}

async function chatWithOpenAI(content) {
  const messages = [
    { "role": "system", "content": `あなたはこの家の家政婦としてよく働いている「はお君」です。以下の主人からの発言に対し、ユーモアのある文章で端的に返してください。` },
    { "role": "user", "content": content },
  ]
  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: messages,
    temperature: 0,
  })

  const answerOpenAI = await response.choices[0].message?.content;
  return answerOpenAI;
}

async function extractFriendVisitInfo(content, userName) {
  const now = moment().tz('Asia/Tokyo').format('YYYY-MM-DDTHH:mm:ssZ');

  const systemPrompt = `
あなたはメッセージから友達の来客情報を抽出するアシスタントです。以下の指示に従ってください。
ただし、メッセージが明らかに来客情報ではないときはエラーを出してください。

1. メッセージから「日付」、「泊まりの有無」、および「来る友達の人数または名前」を抽出してください。
2. メッセージが指している「誰の友達か」を特定してください（ホストは ${userName} です）。
3. 日付が曖昧な場合は、現在の日付（${now}）を基準に解釈してください。
4. 抽出結果をJSON形式で返してください。JSONには以下のフィールドを含めてください。
   - "host": string(${userName})（ホストの名前）
   - "date": string(YYYY/MM/DD)（日付）
   - "stayDays": number（何日泊まるか）
   - "overnight": boolean（泊まりの有無）
   - "friends": string（友達の名前、人数ではないので人は含まないこと）
   - "memo": string（その他メモ）
   - "comment": string（ユーモア溢れる歓迎の言葉か、皮肉たっぷりの意地悪な言葉）

例:
入力: "今週末の土曜日の夕方、友達3人来ても良いですか？（泊まりはしません）"
出力:
{
  "host": "太郎",
  "date": "2024/04/27",
  "stayDays": 0,
  "overnight": false,
  "friends": ""
  "memo": "夕方に3人"
  "comment": "ユーモア溢れる歓迎の言葉か、皮肉たっぷりの意地悪な言葉"
}
`;

  const messages = [
    { "role": "system", "content": systemPrompt },
    { "role": "user", "content": content },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: messages,
    response_format: { "type": "json_object" },
    temperature: 0,
  });

  const answerOpenAI = await response.choices[0].message?.content;
  return answerOpenAI;
}

module.exports = {
  readTextFromBuffer,
  extractTextArrayFromReadResults,
  isReceipt,
  convertOCRTextToJSON,
  chatWithOpenAI,
  extractFriendVisitInfo
};