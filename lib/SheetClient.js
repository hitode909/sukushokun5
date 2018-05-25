const { google } = require('googleapis');

class SheetClient {
  constructor(credentials) {
    this.credentials = credentials;
  }

  async getClient() {
    if (this._client) return this._client;
    const client = await google.auth.getClient({
      credentials: this.credentials,
      scopes: 'https://www.googleapis.com/auth/drive'
    });

    this._client = google.sheets({
      version: 'v4',
      auth: client,
    });

    return this._client;
  }

  async getTargets(sheetId) {
    const targets = [];
    const client = await this.getClient();
    const resSheets = await client.spreadsheets.get({
      spreadsheetId: sheetId,
    });
    for (var i = 0; i < resSheets.data.sheets.length; i++) {
      const sheet = resSheets.data.sheets[i];
      const service = sheet.properties.title;
      const resData = await client.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${service}!A2:B`,
      });
      const data = resData.data;
      const rows = resData.data.values;
      targets.push(...rows.map(row => {
        return {
          name: `${service}/${row[0]}`,
          uri: row[1],
        };
      }))
    }

    return targets;
  }
}

module.exports = SheetClient;

