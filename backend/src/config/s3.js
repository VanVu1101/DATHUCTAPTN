const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const fs = require('fs').promises;

const region = process.env.AWS_REGION || 'ap-southeast-1';
const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME;
const useLocal = String(process.env.USE_LOCAL_UPLOAD || '').toLowerCase() === 'true';
const publicRead = String(process.env.AWS_S3_PUBLIC_READ || '').toLowerCase() === 'true';
const backendHost = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;

let s3Client = null;
if (!useLocal) {
    if (!bucket) {
        throw new Error('Missing AWS_S3_BUCKET or AWS_BUCKET_NAME environment variable');
    }
    s3Client = new S3Client({
        region,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
    });
}

const uploadFile = async ({ fileBuffer, fileName, contentType, folder }) => {
    const key = path.posix.join(folder, `${Date.now()}-${fileName}`);
    if (useLocal) {
        const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
        const outPath = path.join(uploadsDir, key);
        await fs.mkdir(path.dirname(outPath), { recursive: true });
        await fs.writeFile(outPath, fileBuffer);
        return `${backendHost}/uploads/${key.replace(/\\/g, '/')}`;
    }

    try {
        const commandParams = {
            Bucket: bucket,
            Key: key,
            Body: fileBuffer,
            ContentType: contentType,
        };
        if (publicRead) {
            commandParams.ACL = 'public-read';
        }
        const command = new PutObjectCommand(commandParams);

        await s3Client.send(command);
        return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    } catch (error) {
        console.error('S3 upload failed:', error?.message || error);
        throw error;
    }
};

const deleteFile = async (key) => {
    if (useLocal) {
        const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
        const target = path.join(uploadsDir, key);
        try {
            await fs.unlink(target);
        } catch (err) {
            // ignore missing files
        }
        return;
    }

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
