const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

const region = process.env.AWS_REGION || 'ap-southeast-1';
const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME;

if (!bucket) {
    throw new Error('Missing AWS_S3_BUCKET or AWS_BUCKET_NAME environment variable');
}

const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const uploadFile = async ({ fileBuffer, fileName, contentType, folder }) => {
    const key = path.posix.join(folder, `${Date.now()}-${fileName}`);

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: 'public-read',
    });

    await s3Client.send(command);

    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

const deleteFile = async (key) => {
    const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
    });
    await s3Client.send(command);
};

module.exports = {
    uploadFile,
    deleteFile,
};
