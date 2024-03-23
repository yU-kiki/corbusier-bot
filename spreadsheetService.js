const { JWT } = require('google-auth-library');
const { GoogleSpreadsheet } = require('google-spreadsheet');

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function saveToSpreadSheet(jsonResult) {
  try {
    const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID ?? '');
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });

    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];

    if (!sheet) {
      console.error('Sheet not found.');
      return { status: 404, message: 'Sheet not found.' };
    }

    const rowData = [
      jsonResult['日時'],
      `=if(B${sheet.rowCount + 1}="","", YEAR(B${sheet.rowCount + 1})*100+MONTH(B${sheet.rowCount + 1}))`,
      jsonResult['変更ユーザー名'],
      jsonResult['合計金額'],
      jsonResult['項目'],
      `【${jsonResult['店名']}】${jsonResult['明細'].slice(0, 3).map(item => item['商品名']).join('、')}など`
    ];

    await sheet.addRow(rowData);

    return { status: 200, message: 'Successfully saved to SpreadSheet' };
  } catch (error) {
    console.error('Error saving data to SpreadSheet:', error);
    return {
      status: 500,
      message: `Error saving data to SpreadSheet: ${error}`,
    };
  }
}

module.exports = { saveToSpreadSheet };
