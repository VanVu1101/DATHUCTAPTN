const studentService = require('./src/services/student');
(async () => {
  try {
    const file = {
      buffer: Buffer.from([1,2,3]),
      originalname: 'x.png',
      mimetype: 'image/png'
    };
    const result = await studentService.uploadProfileImage(4, file);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('ERR', e.message);
    if (e.$metadata) console.error('META', JSON.stringify(e.$metadata, null, 2));
    if (e.original) console.error('ORIG', JSON.stringify(e.original, null, 2));
    if (e.stack) console.error(e.stack);
    process.exit(1);
  }
})();
