const { Op } = require('sequelize');
const Schedule = require('../models/schedule');
const Meeting = require('../models/meeting');
const Student = require('../models/student');
const { createNotification } = require('./notification');

const TIME_ZONE = 'Asia/Ho_Chi_Minh';

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const parts = String(timeStr).split(':').map(Number);
  if (parts.length < 2) return null;
  return parts[0] * 60 + parts[1];
};

const getTodayLocal = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).split('-');
  return `${parts[0]}-${parts[1]}-${parts[2]}`;
};

const notifyUpcomingEvents = async ({ lookaheadMinutes = 30, notifyBeforeMinutes = 15 } = {}) => {
  try {
    const today = getTodayLocal();
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // Schedules active today
    const schedules = await Schedule.findAll({ where: { startDate: { [Op.lte]: today }, endDate: { [Op.gte]: today } } });
    const meetings = await Meeting.findAll({ where: { meetingDate: today } });

    const candidates = [];

    schedules.forEach((s) => {
      const m = parseTimeToMinutes(s.startTime);
      if (m == null) return;
      const delta = m - nowMinutes;
      if (delta <= lookaheadMinutes && delta >= notifyBeforeMinutes) candidates.push({ kind: 'schedule', item: s, minutesUntil: delta });
    });

    meetings.forEach((m) => {
      const mins = parseTimeToMinutes(m.meetingTime);
      if (mins == null) return;
      const delta = mins - nowMinutes;
      if (delta <= lookaheadMinutes && delta >= notifyBeforeMinutes) candidates.push({ kind: 'meeting', item: m, minutesUntil: delta });
    });

    if (!candidates.length) return;

    // For each candidate, notify relevant students
    for (const c of candidates) {
      const targetPeriod = c.item.periodId || null;
      const students = targetPeriod ? await Student.findAll({ where: { periodId: targetPeriod } }) : await Student.findAll();
      for (const s of students) {
        if (!s.userId) continue;
        const title = c.kind === 'meeting' ? 'Sắp có cuộc họp' : 'Sắp bắt đầu lịch làm việc';
        const message = `${c.item.title} sẽ bắt đầu trong ${c.minutesUntil} phút`;
        try { await createNotification({ userId: s.userId, title, message, type: c.kind === 'meeting' ? 'MEETING' : 'SCHEDULE', data: { id: c.item.id } }); } catch (e) { /* ignore per-user failures */ }
      }
    }
  } catch (error) {
    console.error('checkInAutomation error:', error);
  }
};

module.exports = { notifyUpcomingEvents };
