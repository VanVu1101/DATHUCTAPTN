const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function run() {
  const API = process.env.BACKEND_URL || 'http://localhost:5000/api';
  const TOKEN = process.env.TEST_TOKEN;
  if (!TOKEN) {
    console.error('Set TEST_TOKEN env var to a valid JWT.');
    process.exit(1);
  }
  try {
    // submit report with file
    const form = new FormData();
    form.append('weeklyReportId', '1');
    form.append('content', 'E2E upload test');
    form.append('file', fs.createReadStream('./sample.pdf'));

    const submitRes = await axios.post(`${API}/reports`, form, {
      headers: { Authorization: `Bearer ${TOKEN}`, ...form.getHeaders() },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    console.log('submitRes:', submitRes.data);

    // list my reports
    const list = await axios.get(`${API}/reports/me`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    console.log('my reports:', list.data);

    // download the latest report if exists
    const reports = list.data?.data || [];
    if (reports.length) {
      const id = reports[0].id;
      console.log(`Attempting download proxy for report ${id}`);
      const dl = await axios.get(`${API}/reports/${id}/download`, { headers: { Authorization: `Bearer ${TOKEN}` }, maxRedirects: 0, validateStatus: null });
      console.log('download response status/headers:', dl.status, dl.headers.location || 'no-location');
    }
  } catch (e) {
    console.error('E2E error:', e.response?.data || e.message || e);
    process.exit(1);
  }
}

run();
