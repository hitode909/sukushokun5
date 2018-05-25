const { google } = require('googleapis');
const fs = require('fs');
const toStream = require('buffer-to-stream');
const Target = require('./Target.js');

class DriveClient {
  constructor(credentials) {
    this.credentials = credentials;
  }

  async getDrive() {
    if (this._drive) return this._drive;
    const client = await google.auth.getClient({
      credentials: this.credentials,
      scopes: 'https://www.googleapis.com/auth/drive'
    });

    this._drive = google.drive({
      version: 'v3',
      auth: client
    });

    return this._drive;
  }

  async getTargets() {
    const drive = await this.getDrive();
    const list = await drive.files.list({
      q: 'mimeType = "application/vnd.google-apps.folder" and name contains "http"',
    });

    // TODO: paging
    return list.data.files.map(
      item => new Target(item.id, item.name)
    ).filter(
      target => target.isValid()
    );
  }

  async upload(args) {
    const name = args.name;
    const description = args.description;
    const folderId = args.folderId;
    const buffer = args.buffer;
    const properties = args.properties;

    const drive = await this.getDrive();

    const res = await drive.files.create({
      resource: {
        name: name,
        description: description,
        parents: [folderId]
      },
      media: {
        body: toStream(buffer),
      }
    });
    return res.data;
  }

  async deleteOldFiles(until) {
    const drive = await this.getDrive();
    const query = `(mimeType = "application/pdf" or mimeType contains "image/") and createdTime < "${until.toISOString()}" and (name contains "PC" or name contains "SP")`;
    const res = await drive.files.list({
      q: query,
    });
    for (var i = 0; i < res.data.files.length; i++) {
      const file = res.data.files[i];
      const name = file.name;
      const id = res.data.files[i].id;
      console.log(`delete ${id} ${name}`);
      await drive.files.delete({
        fileId: id,
      });
    }
  }
}

module.exports = DriveClient;

