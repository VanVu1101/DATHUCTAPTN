const test = require('node:test');
const assert = require('node:assert/strict');
const { filterStudentRecords, shouldCreateStudentProfile } = require('../services/studentHelpers');

test('filterStudentRecords keeps only students belonging to STUDENT users', () => {
  const records = [
    { id: 1, fullName: 'Alice', User: { role: 'STUDENT' } },
    { id: 2, fullName: 'Admin', User: { role: 'ADMIN' } },
    { id: 3, fullName: 'Bob', User: { role: 'STUDENT' } }
  ];

  const result = filterStudentRecords(records);

  assert.deepEqual(result.map((item) => item.id), [1, 3]);
  assert.equal(result.every((item) => item.User?.role === 'STUDENT'), true);
});

test('shouldCreateStudentProfile returns false for admin and mentor accounts', () => {
  assert.equal(shouldCreateStudentProfile({ role: 'STUDENT' }), true);
  assert.equal(shouldCreateStudentProfile({ role: 'ADMIN' }), false);
  assert.equal(shouldCreateStudentProfile({ role: 'MENTOR' }), false);
});
