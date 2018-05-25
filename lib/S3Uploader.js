const S3 = require('aws-sdk/clients/s3');

class S3Uploader {
  constructor(id, key, bucket) {
    this.id = id;
    this.key = key;
    this.bucket = bucket;
  }
  // args: {body, key}
  async upload(args) {
    const s3 = new S3({
      accessKeyId: this.id,
      secretAccessKey: this.key,
    });
    return new Promise((resolve, reject) => {
      s3.putObject({
        Bucket: this.bucket,
        Key: args.key,
        Body: args.buffer,
        ContentType: args.contentType,
        Metadata: args.metadata,
      }, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });
  }
}

module.exports = S3Uploader;

