require('dotenv').config();
const { S3Client, HeadBucketCommand, ListBucketsCommand } = require('@aws-sdk/client-s3');
const region = process.env.AWS_REGION || 'us-east-1';
const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME;
const client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

console.log('region=', region);
console.log('bucket=', bucket);

client.send(new ListBucketsCommand({}))
  .then((list) => {
    console.log('listBucketsCount=', (list.Buckets || []).length);
    return client.send(new HeadBucketCommand({ Bucket: bucket }));
  })
  .then(() => {
    console.log('HeadBucket OK');
    process.exit(0);
  })
  .catch((err) => {
    console.error('ERROR name=', err.name);
    console.error('ERROR message=', err.message);
    console.error('ERROR metadata=', JSON.stringify(err.$metadata || {}));
    process.exit(1);
  });
