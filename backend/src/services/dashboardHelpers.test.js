const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDashboardSummary } = require('./dashboardHelpers');

test('buildDashboardSummary aggregates overview stats and recent data', () => {
  const summary = buildDashboardSummary(
    {
      totalStudents: 24,
      totalInternships: 8,
      pendingReports: 3,
      totalEnterprises: 5,
      totalCheckIns: 40,
      totalTasks: 12,
      completedTasks: 7,
      inProgressTasks: 3,
      overdueTasks: 2
    },
    [
      { id: 1, weekNumber: 4, status: 'SUBMITTED', createdAt: '2026-07-21T10:00:00.000Z', Student: { fullName: 'An' } },
      { id: 2, weekNumber: 5, status: 'APPROVED', createdAt: '2026-07-20T10:00:00.000Z', Student: { fullName: 'Bình' } }
    ],
    [
      { id: 1, title: 'Thiết kế UI', status: 'DONE', priority: 'HIGH', deadline: '2026-07-22T00:00:00.000Z', Student: { fullName: 'An' } }
    ]
  );

  assert.equal(summary.overview.totalStudents, 24);
  assert.equal(summary.overview.pendingReports, 3);
  assert.equal(summary.progress.completedPercent, 58);
  assert.equal(summary.recentReports.length, 2);
  assert.equal(summary.recentTasks[0].title, 'Thiết kế UI');
  assert.equal(summary.insights[0].title, 'Tiến độ công việc');
});

test('buildDashboardSummary uses safe defaults when no data exists', () => {
  const summary = buildDashboardSummary(null, [], []);

  assert.equal(summary.overview.totalStudents, 0);
  assert.equal(summary.progress.totalTasks, 0);
  assert.equal(summary.recentReports.length, 0);
  assert.equal(summary.recentTasks.length, 0);
});
