const { google } = require('googleapis');

async function saveToSpreadSheet(jsonResult) {
  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheetId = process.env.SPREADSHEET_ID;
    const sheetName = '履歴';

    const getRows = await googleSheetsInstance.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!B:B`,
    });
    const firstEmptyRow = getRows.data.values ? getRows.data.values.length + 1 : 1;

    const range = `${sheetName}!B${firstEmptyRow}:G${firstEmptyRow}`
    const values = [
      [
        jsonResult['日時'],
        `=if(${sheetName}!B${firstEmptyRow}="","", YEAR(${sheetName}!B${firstEmptyRow})*100+MONTH(${sheetName}!B${firstEmptyRow}))`,
        jsonResult['変更ユーザー名'],
        jsonResult['合計金額'],
        jsonResult['項目'],
        `【${jsonResult['店名']}】${jsonResult['明細'].slice(0, 3).map(item => item['商品名']).join('、')}など`,
      ],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    console.log('Successfully saved to SpreadSheet');
  } catch (error) {
    console.error('Error saving data to SpreadSheet:', error);
    return {
      status: 500,
      message: `Error saving data to SpreadSheet: ${error}`,
    };
  }
}

module.exports = { saveToSpreadSheet };
