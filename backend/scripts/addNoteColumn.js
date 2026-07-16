require('dotenv').config();
(async () => {
  const mysql = require('mysql2/promise');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'internship_management'
  });
  try {
    await conn.execute('ALTER TABLE check_ins ADD COLUMN note TEXT NULL');
    console.log('ALTER TABLE OK');
  } catch (e) {
    console.error('ALTER ERROR', e.message);
  } finally {
    await conn.end();
  }
})();
