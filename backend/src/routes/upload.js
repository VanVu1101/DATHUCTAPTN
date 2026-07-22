const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const region = process.env.AWS_REGION || 'ap-southeast-1';
const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME;
const publicRead = String(process.env.AWS_S3_PUBLIC_READ || '').toLowerCase() === 'true';
const allowAclPublicRead = String(process.env.AWS_S3_ALLOW_ACL_PUBLIC_READ || '').toLowerCase() === 'true';
const signedUrlExpiresIn = Number(process.env.AWS_S3_SIGNED_URL_EXPIRES_IN || process.env.AWS_S3_URL_EXPIRES_IN || 86400);

router.post('/presign', verifyToken, async (req, res) => {
    try {
        const { fileName, contentType, folder = 'uploads' } = req.body;
        if (!fileName || !contentType) return res.status(400).json({ success: false, message: 'fileName and contentType required' });
        if (!bucket) return res.status(500).json({ success: false, message: 'S3 bucket not configured' });

        const key = `${folder}/${Date.now()}-${fileName}`;
        const clientConfig = { region };
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
            clientConfig.credentials = {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {})
            };
        }
        const s3 = new S3Client(clientConfig);
        const commandParams = { Bucket: bucket, Key: key, ContentType: contentType };
        if (publicRead && allowAclPublicRead) {
            commandParams.ACL = 'public-read';
        }
        const cmd = new PutObjectCommand(commandParams);
        const url = await getSignedUrl(s3, cmd, { expiresIn: 60 }); // 60s

        const publicUrl = publicRead
            ? `https://${bucket}.s3.${region}.amazonaws.com/${key}`
            : null;

        res.json({ success: true, url, key, publicUrl });
    } catch (error) {
        console.error('presign error', error);
        res.status(500).json({ success: false, message: 'Lỗi khi tạo presign URL' });
    }
});

    // Return a GET URL for a stored key (signed if private)
    router.get('/url', verifyToken, async (req, res) => {
        try {
            const key = req.query.key;
            if (!key) return res.status(400).json({ success: false, message: 'key query param required' });
            // If bucket not configured, assume local uploads
            const useLocal = String(process.env.USE_LOCAL_UPLOAD || '').toLowerCase() === 'true' || !bucket;
            if (useLocal) {
                const backendHost = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
                return res.json({ success: true, url: `${backendHost}/uploads/${key.replace(/\\/g, '/')}` });
            }

            const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
            const { getSignedUrl: getSigned } = require('@aws-sdk/s3-request-presigner');
            const clientConfig = { region };
            if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
                clientConfig.credentials = {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {})
                };
            }
            const s3 = new S3Client(clientConfig);

            if (publicRead) {
                return res.json({ success: true, url: `https://${bucket}.s3.${region}.amazonaws.com/${key}` });
            }

            const url = await getSigned(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: signedUrlExpiresIn });
            res.json({ success: true, url });
        } catch (error) {
            console.error('get file url error', error);
            res.status(500).json({ success: false, message: 'Không thể tạo URL cho file' });
        }
    });

module.exports = router;
