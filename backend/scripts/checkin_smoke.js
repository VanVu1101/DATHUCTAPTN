const axios = require('axios');

// Usage: BASE_URL=http://localhost:5000 TOKEN=Bearer\ <token> node checkin_smoke.js
// Example: BASE_URL=http://localhost:5000 TOKEN="Bearer abc.." node checkin_smoke.js

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TOKEN = process.env.TOKEN || '';

if (!TOKEN) {
  console.error('Please provide TOKEN env var (Bearer <token>)');
  process.exit(1);
}

const client = axios.create({ baseURL: BASE_URL, headers: { Authorization: TOKEN } });

async function run() {
  try {
    console.log('GET /api/checkin/me');
    const me = await client.get('/api/checkin/me');
    console.log('ME:', me.data);
  } catch (e) {
    console.warn('GET /api/checkin/me failed', e.response ? e.response.data : e.message);
  }

  try {
    console.log('POST /api/checkin (attempt)');
    const res = await client.post('/api/checkin', {});
    console.log('CHECKIN RESULT:', res.data);
  } catch (e) {
    console.warn('CHECKIN failed:', e.response ? e.response.data : e.message);
  }

  try {
    console.log('POST /api/checkin/checkout (attempt)');
    const res = await client.post('/api/checkin/checkout', {});
    console.log('CHECKOUT RESULT:', res.data);
  } catch (e) {
    console.warn('CHECKOUT failed:', e.response ? e.response.data : e.message);
  }
}

run();
