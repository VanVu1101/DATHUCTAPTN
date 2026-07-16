require('dotenv').config();
const jwt = require('jsonwebtoken');
const axios = require('axios');

(async () => {
  const id = 1;
  const token = jwt.sign({ id, role: 'STUDENT', email: `user${id}@example.com` }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
  const payload = { date: '2026-07-16', time: new Date().toTimeString().split(' ')[0], status: 'PRESENT', note: 'Tự động bấm nút (test)' };
  console.log('Using token for id', id);
  try {
    const res = await axios.post('http://localhost:5000/api/checkins', payload, { headers: { Authorization: 'Bearer ' + token } });
    console.log('OK', res.data);
  } catch (err) {
    console.error('ERR', err.response ? JSON.stringify(err.response.data) : err.message);
  }
})();
