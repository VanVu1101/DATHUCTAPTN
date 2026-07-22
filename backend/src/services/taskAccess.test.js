const test = require('node:test');
const assert = require('node:assert/strict');
const { canManageTask, canSubmitTask } = require('./taskAccess');

test('admins and mentors can manage tasks', () => {
  assert.equal(canManageTask('ADMIN', null), true);
  assert.equal(canManageTask('MENTOR', { id: 7 }), true);
  assert.equal(canManageTask('STUDENT', null), false);
  assert.equal(canManageTask('ENTERPRISE', null), false);
});

test('only students can submit their tasks', () => {
  assert.equal(canSubmitTask('STUDENT'), true);
  assert.equal(canSubmitTask('ADMIN'), false);
  assert.equal(canSubmitTask('MENTOR'), false);
  assert.equal(canSubmitTask('ENTERPRISE'), false);
});
