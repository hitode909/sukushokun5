const Fetcher = require('./Fetcher');
const DriveClient = require('./DriveClient');
const S3Uploader = require('./S3Uploader');
const Queue = require('promise-queue');

class Sukushokun {
  constructor() {
    this.fetcher = new Fetcher();
    // this.driveClient = this.createDriveClient();
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

  createDriveClient() {
    if (!process.env.GOOGLE_CREDENTIAL) {
      throw "Please set your service account's credentials JSON at GOOGLE_CREDENTIAL";
    }

    return new DriveClient(JSON.parse(process.env.GOOGLE_CREDENTIAL));
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
      const epoch = (new Date()).getTime();
      console.log(`Capturing ${target.uri}`);
      const screenshots = await this.fetcher.capture(target.uri);

      await Promise.all(
        screenshots.map(async (screenshot) => {
          await this.uploadQueue.add(async () => {
            const key = `${target.name}/${epoch}-${screenshot.type}.${screenshot.ext}`;
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

  prepareTargets() {
    const parts = (process.env.TARGETS || '').split(/\s+/).filter(s => s.length > 0);
    if (!parts.length) {
      throw 'Please set TARGETS="NAME URI NAME URI ..."';
    }
    const targets = [];
    while (parts.length > 0) {
      const name = parts.shift();
      const uri = parts.shift();
      targets.push({
        name: name,
        uri: uri,
      });
    }
    return targets;
  }

  run() {
    (async () => {
      const targets = this.prepareTargets();

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
