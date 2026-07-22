const studentService = require('./src/services/student');
const util = require('util');
(async () => {
  try {
    console.log('\n=== S3 DIAGNOSTIC RUN ===\n');
    console.log('ENV:');
    console.log('  AWS_REGION=', process.env.AWS_REGION || '<not set>');
    console.log('  AWS_S3_BUCKET=', process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || '<not set>');
    console.log('  USE_LOCAL_UPLOAD=', process.env.USE_LOCAL_UPLOAD || '<not set>');
    console.log('  AWS_ACCESS_KEY_ID=', !!process.env.AWS_ACCESS_KEY_ID);
    console.log('  AWS_SECRET_ACCESS_KEY=', !!process.env.AWS_SECRET_ACCESS_KEY);
    console.log('');

    const file = {
      buffer: Buffer.from([1,2,3]),
      originalname: 'x.png',
      mimetype: 'image/png'
    };

    console.log('Attempting uploadProfileImage for userId=4 (this will exercise S3 upload and DB update)');
    const result = await studentService.uploadProfileImage(4, file);
    console.log('\nUpload result:\n', util.inspect(result, { depth: 4 }));

    console.log('\nAttempting presignProfileImage for userId=4');
    try {
      const presigned = await studentService.presignProfileImage(4);
      console.log('Presigned URL:\n', presigned);
    } catch (pErr) {
      console.error('Presign failed:', pErr && pErr.message ? pErr.message : pErr);
      if (pErr && pErr.$metadata) console.error('Presign meta:', JSON.stringify(pErr.$metadata, null, 2));
    }

    console.log('\n=== DIAGNOSTIC COMPLETE ===\n');
    process.exit(0);
  } catch (e) {
    console.error('\nERROR during diagnostic run:');
    console.error('Message:', e.message || e);
    if (e.$metadata) console.error('AWS metadata:', JSON.stringify(e.$metadata, null, 2));
    if (e.original) console.error('Original:', JSON.stringify(e.original, null, 2));
    if (e.stack) console.error('Stack:', e.stack);
    console.error('\nIf you see AccessDenied, check IAM policy, bucket policy, and KMS key policy (if SSE-KMS enabled).');
    process.exit(1);
  }
})();
