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
const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME;
let useLocal = String(process.env.USE_LOCAL_UPLOAD || '').toLowerCase() === 'true';
// If bucket is not configured, default to local uploads to avoid runtime failures in dev
if (!bucket) useLocal = true;
const publicRead = String(process.env.AWS_S3_PUBLIC_READ || '').toLowerCase() === 'true';
const signedUrlExpiresIn = Number(process.env.AWS_S3_SIGNED_URL_EXPIRES_IN || process.env.AWS_S3_URL_EXPIRES_IN || 86400);
const allowAclPublicRead = String(process.env.AWS_S3_ALLOW_ACL_PUBLIC_READ || '').toLowerCase() === 'true';
const backendHost = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
const endpoint = process.env.AWS_S3_ENDPOINT || undefined;
const forcePathStyle = String(process.env.AWS_S3_FORCE_PATH_STYLE || '').toLowerCase() === 'true';

const isClockSkewError = (error) => {
    const message = String(error?.message || error || '');
    const code = String(error?.Code || error?.name || '').toLowerCase();
    return message.includes('not yet valid') || message.includes('request has expired') || message.includes('request time skew') || code.includes('requesttime') || code.includes('requesttime_skewed');
};

const sanitizeFileName = (fileName = '') => {
    const normalized = String(fileName)
        .trim()
        .normalize('NFKD')
        .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
        .replace(/[\/:*?"<>|]/g, '-')
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    return normalized || 'file';
};

const buildFileUrl = (rawUrl) => {
    if (!rawUrl) return rawUrl;
    try {
        return encodeURI(rawUrl);
    } catch (error) {
        return rawUrl;
    }
};

let resolvedRegion = region;
let s3Client = null;

const createS3Client = (regionOverride) => {
    const clientConfig = { region: regionOverride || resolvedRegion };
    if (endpoint) clientConfig.endpoint = endpoint;
    if (forcePathStyle) clientConfig.forcePathStyle = true;
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        clientConfig.credentials = {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {})
        };
    }
    return new S3Client(clientConfig);
};

if (!useLocal) {
    s3Client = createS3Client(resolvedRegion);
}

const getAwsRegionFromError = (error) => {
    if (!error) return null;
    const headers = error?.$response?.httpResponse?.headers || error?.$metadata?.httpHeaders;
    if (!headers) return null;
    const getHeader = (key) => {
        if (typeof headers.get === 'function') return headers.get(key);
        return headers[key] || headers[key.toLowerCase()];
    };
    return getHeader('x-amz-bucket-region') || getHeader('X-Amz-Bucket-Region');
};

const updateResolvedRegion = (newRegion) => {
    if (!newRegion || newRegion === resolvedRegion) return;
    resolvedRegion = newRegion;
    s3Client = createS3Client(resolvedRegion);
};

const uploadFile = async ({ fileBuffer, fileName, contentType, folder, returnMetadata = false }) => {
    const safeFileName = sanitizeFileName(fileName);
    const key = path.posix.join(folder, `${Date.now()}-${safeFileName}`);
    if (useLocal) {
        const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
        const outPath = path.join(uploadsDir, key);
        await fs.mkdir(path.dirname(outPath), { recursive: true });
        await fs.writeFile(outPath, fileBuffer);
        const url = buildFileUrl(`${backendHost}/uploads/${key.replace(/\\/g, '/')}`);
        return returnMetadata ? { url, key } : url;
    }

    const commandParams = {
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
    };
    if (publicRead && allowAclPublicRead) {
        commandParams.ACL = 'public-read';
    }
    const command = new PutObjectCommand(commandParams);

    try {
        await s3Client.send(command);
    } catch (error) {
        const newRegion = getAwsRegionFromError(error);
        if (newRegion && newRegion !== resolvedRegion) {
            console.warn(`S3 PermanentRedirect detected. Retrying with region ${newRegion}.`);
            updateResolvedRegion(newRegion);
            await s3Client.send(command);
        } else {
            console.error('S3 upload failed:', error?.message || error);
            throw error;
        }
    }

    const activeRegion = resolvedRegion || region;
    const permanentUrl = buildFileUrl(`https://${bucket}.s3.${activeRegion}.amazonaws.com/${key}`);
    const url = returnMetadata && !publicRead
        ? await (async () => {
            try {
                return await getSignedUrl(
                    s3Client,
                    new GetObjectCommand({ Bucket: bucket, Key: key }),
                    { expiresIn: signedUrlExpiresIn }
                );
            } catch (error) {
                if (isClockSkewError(error)) {
                    console.warn('S3 signed URL generation failed due to time skew; falling back to public URL.', error?.message || error);
                    return permanentUrl;
                }
                throw error;
            }
        })()
        : permanentUrl;
    return returnMetadata ? { url, key } : url;
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

const getFileUrl = async (key, expiresIn = signedUrlExpiresIn) => {
    if (!key) return null;
    if (useLocal) return buildFileUrl(`${backendHost}/uploads/${key.replace(/\\/g, '/')}`);
    const activeRegion = resolvedRegion || region;
    if (publicRead) return buildFileUrl(`https://${bucket}.s3.${activeRegion}.amazonaws.com/${key}`);
    try {
        return await getSignedUrl(
            s3Client,
            new GetObjectCommand({ Bucket: bucket, Key: key }),
            { expiresIn }
        );
    } catch (error) {
        if (isClockSkewError(error)) {
            console.warn('S3 signed URL retrieval failed due to time skew; falling back to public URL.', error?.message || error);
            return buildFileUrl(`https://${bucket}.s3.${activeRegion}.amazonaws.com/${key}`);
        }
        throw error;
    }
};

module.exports = {
    uploadFile,
    deleteFile,
    getFileUrl,
};
