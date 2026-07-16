require('dotenv').config();
const jwt = require('jsonwebtoken');
const axios = require('axios');

(async () => {
  const ids = [1,2,3,4,5,6,7,8,9,10,11,12];
  for (const id of ids) {
    try {
      const token = jwt.sign({ id, role: 'STUDENT', email: `user${id}@example.com` }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
      const payload = { date: '2026-07-16', time: new Date().toTimeString().split(' ')[0], status: 'PRESENT' };
      console.log('\n--- ID', id, '---');
      const res = await axios.post('http://localhost:5000/api/checkins', payload, { headers: { Authorization: 'Bearer ' + token } });
      console.log('OK', res.data);
    } catch (err) {
      console.log('ERR', err.response ? err.response.data : err.message);
    }
  }
  process.exit(0);
})();
