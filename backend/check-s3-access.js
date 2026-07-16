const { S3Client, HeadBucketCommand, ListBucketsCommand } = require('@aws-sdk/client-s3');
(async () => {
  try {
    const client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    });
    console.log('region', process.env.AWS_REGION);
    console.log('bucket', process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME);
    const list = await client.send(new ListBucketsCommand({}));
    console.log('listBucketsCount', list.Buckets?.length);
    const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME;
    if (bucket) {
      try {
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
        console.log('HeadBucket OK');
      } catch (err) {
        console.error('HeadBucket ERR', err.name, err.$metadata && err.$metadata.httpStatusCode, err.message);
      }
    }
  } catch (err) {
    console.error('ERR', err.name, err.$metadata && err.$metadata.httpStatusCode, err.message);
  }
})();
