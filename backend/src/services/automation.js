const Notification = require('../models/notification');
const Student = require('../models/student');
const Task = require('../models/task');
const Mentor = require('../models/mentor');
const User = require('../models/user');

const notifyTaskAssigned = async (task) => {
  if (!task?.studentId) return null;
  const student = await Student.findByPk(task.studentId);
  if (!student?.userId) return null;

  return Notification.create({
    userId: student.userId,
    title: 'Bạn có nhiệm vụ mới',
    message: `Nhiệm vụ "${task.title}" đã được giao cho bạn.`,
    type: 'TASK_ASSIGNED',
    data: { taskId: task.id }
  });
};

const notifyDeadlineSoon = async (task, now = new Date()) => {
  if (!task?.deadline || !task?.studentId) return null;
  const student = await Student.findByPk(task.studentId);
  if (!student?.userId) return null;

  const deadline = new Date(task.deadline);
  const diffHours = (deadline - now) / (1000 * 60 * 60);

  if (task.status === 'DONE') return null;
  if (diffHours <= 0) return null;

  const reminder = diffHours <= 3 ? { key: '3h', label: '3 giờ', title: 'Sắp đến hạn nộp nhiệm vụ', message: `Nhiệm vụ "${task.title}" sẽ hết hạn trong vòng 3 giờ.` }
    : diffHours <= 24 ? { key: '24h', label: '24 giờ', title: 'Sắp đến hạn nộp nhiệm vụ', message: `Nhiệm vụ "${task.title}" sẽ hết hạn trong vòng 24 giờ.` }
    : null;

  if (!reminder) return null;

  const existing = await Notification.findAll({ where: { userId: student.userId, type: 'TASK_DEADLINE' } });
  const hasSent = existing.some((item) => item?.data?.taskId === task.id && item?.data?.reminderKey === reminder.key);
  if (hasSent) return null;

  return Notification.create({
    userId: student.userId,
    title: reminder.title,
    message: reminder.message,
    type: 'TASK_DEADLINE',
    data: { taskId: task.id, reminderKey: reminder.key }
  });
};

const notifyDeadlineRemindersForStudent = async (studentId, now = new Date()) => {
  const tasks = await Task.findAll({ where: { studentId, status: { [require('sequelize').Op.ne]: 'DONE' } } });
  const results = [];

  for (const task of tasks) {
    if (!task.deadline) continue;
    const result = await notifyDeadlineSoon(task, now);
    if (result) results.push(result);
  }

  return Promise.all(results);
};

const notifyOverdueTasks = async () => {
  const now = new Date();
  const tasks = await Task.findAll({ where: { status: { [require('sequelize').Op.ne]: 'DONE' } } });
  const results = [];

  for (const task of tasks) {
    if (!task.deadline) continue;
    const deadline = new Date(task.deadline);
    if (deadline < now) {
      const student = await Student.findByPk(task.studentId);
      if (student?.userId) {
        results.push(Notification.create({
          userId: student.userId,
          title: 'Nhiệm vụ đã quá hạn',
          message: `Nhiệm vụ "${task.title}" đã quá hạn. Vui lòng xử lý sớm.`,
          type: 'TASK_OVERDUE',
          data: { taskId: task.id }
        }));
      }
    }
  }

  return Promise.all(results);
};

module.exports = { notifyTaskAssigned, notifyDeadlineSoon, notifyDeadlineRemindersForStudent, notifyOverdueTasks };
