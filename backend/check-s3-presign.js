const s3 = require('./src/config/s3');

(async () => {
  const key = process.argv[2];
  if (!key) {
    console.error('Usage: node check-s3-presign.js <s3-key>');
    process.exit(1);
  }

  try {
    console.log('Attempting to get presigned URL for key:', key);
    const url = await s3.getFileUrl(key, 3600);
    console.log('Presigned URL (or public fallback):\n', url);
  } catch (err) {
    console.error('Error generating URL:', err && err.message ? err.message : err);
    if (err && err.$metadata) console.error('AWS metadata:', JSON.stringify(err.$metadata, null, 2));
    process.exit(1);
  }
})();
