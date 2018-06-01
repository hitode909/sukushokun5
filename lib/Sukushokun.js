const Fetcher = require('./Fetcher');
const SheetClient = require('./SheetClient');
const S3Uploader = require('./S3Uploader');
const Queue = require('promise-queue');

class Sukushokun {
  constructor() {
    this.fetcher = new Fetcher();
     this.sheetClient = this.createSheetClient();
    this.downloadQueue = this.createQueue();
    this.uploadQueue = this.createQueue();
    this.s3Uploader = this.createS3Uploader();
  }

  createS3Uploader() {
    ['AWS_ACCESS_ID', 'AWS_ACCESS_SECRET', 'AWS_BUCKET_NAME'].forEach(name => {
      if (!process.env[name]) {
        throw `Please set ${name}`;
      }
    });
    return new S3Uploader(process.env.AWS_ACCESS_ID, process.env.AWS_ACCESS_SECRET, process.env.AWS_BUCKET_NAME);
  }

  createSheetClient() {
    if (!process.env.GOOGLE_CREDENTIAL) {
      throw "Please set your service account's credentials JSON at GOOGLE_CREDENTIAL";
    }

    return new SheetClient(JSON.parse(process.env.GOOGLE_CREDENTIAL));
  }

  createQueue() {
    const DEFAULT_CONCURRENCY = 1;
    const maxConcurrent = + (process.env.NUM_WORKERS || DEFAULT_CONCURRENCY);
    const maxQueue = Infinity;
    return new Queue(maxConcurrent, maxQueue);
  }

  // target: {uri, name}
  async download(target) {
    try {
      const ymd = new Date().toISOString().substr(0, 10).replace(/-/g, '/');
      const epoch = (new Date()).getTime();
      console.log(`Capturing ${target.uri}`);
      const screenshots = await this.fetcher.capture(target.uri);

      await Promise.all(
        screenshots.map(async (screenshot) => {
          await this.uploadQueue.add(async () => {
            const key = `${target.name}/${ymd}/${epoch}-${screenshot.type}.${screenshot.ext}`;
            console.log(`Uploading ${key}`);

            await await this.s3Uploader.upload({
              key: key,
              buffer: screenshot.buffer,
              metadata: {
                uri: target.uri,
              },
              contentType: screenshot.contentType,
            });
          });
        })
      );
    } catch (error) {
      console.warn(error);
    }
  }

  async prepareTargets() {
    if (!process.env.SPREADSHEET_ID) {
      throw "Please set your SPREADSHEET_ID";
    }
    return this.sheetClient.getTargets(process.env.SPREADSHEET_ID);
  }

  run() {
    (async () => {
      const targets = await this.prepareTargets();

      await Promise.all(
        targets.map(async (target) => {
          await this.downloadQueue.add(async () => {
            await this.download(target);
          });
        })
      );

      console.log('Closing browser');
      await this.fetcher.closeBrowser();
      process.exit(0);
    })();
  }
};

module.exports = Sukushokun;
