const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeReportStatus, getReportStatusLabel } = require('./reportWorkflow');

test('normalizes report status to supported workflow values', () => {
  assert.equal(normalizeReportStatus('approved'), 'REVIEWED');
  assert.equal(normalizeReportStatus('pending'), 'DRAFT');
  assert.equal(normalizeReportStatus('submitted'), 'SUBMITTED');
});

test('returns UI labels for each workflow state', () => {
  assert.equal(getReportStatusLabel('DRAFT'), 'Bản nháp');
  assert.equal(getReportStatusLabel('SUBMITTED'), 'Đã nộp');
  assert.equal(getReportStatusLabel('REVIEWED'), 'Đã duyệt');
  assert.equal(getReportStatusLabel('REJECTED'), 'Cần chỉnh sửa');
});
