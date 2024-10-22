// src/services/calendarService.js

const { google } = require('googleapis');

/**
 * Google Calendar にイベントを追加する関数
 * @param {Object} jsonResult - 友達の来客情報
 * @param {string} jsonResult.host - ホストの名前
 * @param {string} jsonResult.date - 日付（YYYY/MM/DD）
 * @param {string} jsonResult.stayDays - 何日泊まるか
 * @param {boolean} jsonResult.overnight - 泊まりの有無
 * @param {string} jsonResult.friends - 友達の名前
 * @param {string} jsonResult.memo - その他メモ
 * @param {string} jsonResult.comment - 歓迎の言葉
 * @returns {Object} - 処理結果
 */
async function addToCalendar(jsonResult) {
  try {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/calendar']
    );

    const calendar = google.calendar({ version: 'v3', auth });

    const [year, month, day] = jsonResult.date.split('/').map(Number);
    const startDate = new Date(year, month - 1, day);
    const stayDays = jsonResult.stayDays ? jsonResult.stayDays : 1;
    const endDate = new Date(year, month - 1, day + stayDays); 

    const who = jsonResult.friends ? jsonResult.friends : `${jsonResult.host}の友達`;
    const event = {
      summary: `【来客】${who}`,
      description: `来客: ${who}\n泊まり: ${jsonResult.overnight ? '◯' : '✕'}\nメモ: ${jsonResult.memo}`,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
      colorId: 8,
    };

    const calendarId = process.env.CALENDAR_ID;

    const response = await calendar.events.insert({
      calendarId,
      resource: event,
    });

    console.log('Event created: %s', response.data.htmlLink);
    return { status: 200, message: 'Successfully added to Calendar' };
  } catch (error) {
    console.error('Error adding event to Calendar:', error);
    return { status: 500, message: `Error adding event to Calendar: ${error.message}` };
  }
}

module.exports = { addToCalendar };
