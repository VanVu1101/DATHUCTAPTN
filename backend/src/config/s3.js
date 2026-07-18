const {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
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
    const clientConfig = { region };
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        clientConfig.credentials = {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        };
    }
    // Without explicit keys the AWS SDK uses the default credential chain,
    // including the IAM role attached to an EC2/ECS workload.
    s3Client = new S3Client(clientConfig);
}

const uploadFile = async ({ fileBuffer, fileName, contentType, folder, returnMetadata = false }) => {
    const key = path.posix.join(folder, `${Date.now()}-${fileName}`);
    if (useLocal) {
        const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
        const outPath = path.join(uploadsDir, key);
        await fs.mkdir(path.dirname(outPath), { recursive: true });
        await fs.writeFile(outPath, fileBuffer);
        const url = `${backendHost}/uploads/${key.replace(/\\/g, '/')}`;
        return returnMetadata ? { url, key } : url;
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
        const permanentUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
        const url = returnMetadata && !publicRead
            ? await getSignedUrl(
                s3Client,
                new GetObjectCommand({ Bucket: bucket, Key: key }),
                { expiresIn: 15 * 60 }
            )
            : permanentUrl;
        return returnMetadata ? { url, key } : url;
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

const getFileUrl = async (key, expiresIn = 15 * 60) => {
    if (!key) return null;
    if (useLocal) return `${backendHost}/uploads/${key.replace(/\\/g, '/')}`;
    if (publicRead) return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    return getSignedUrl(
        s3Client,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn }
    );
};

module.exports = {
    uploadFile,
    deleteFile,
    getFileUrl,
};
