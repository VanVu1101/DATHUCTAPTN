const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeReportStatus, getReportStatusLabel } = require('./reportWorkflow');

test('normalizes report status to supported workflow values', () => {
  assert.equal(normalizeReportStatus('approved'), 'REVIEWED');
  assert.equal(normalizeReportStatus('pending'), 'SUBMITTED');
  assert.equal(normalizeReportStatus('submitted'), 'SUBMITTED');
  assert.equal(normalizeReportStatus('needs revision'), 'REJECTED');
});

test('returns UI labels for each workflow state', () => {
  assert.equal(getReportStatusLabel('DRAFT'), 'Bản nháp');
  assert.equal(getReportStatusLabel('SUBMITTED'), 'Chờ duyệt');
  assert.equal(getReportStatusLabel('REVIEWED'), 'Đã duyệt');
  assert.equal(getReportStatusLabel('REJECTED'), 'Cần sửa');
});
