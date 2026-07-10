const Notification = require('../models/notification');
const Student = require('../models/student');

const createNotification = async ({ userId, title, message, type = 'GENERIC', data = null }) => {
  if (!userId) throw new Error('userId is required to create notification');
  const n = await Notification.create({ userId, title, message, type, data });
  return n;
};

const getNotificationsForUser = async (userId, { limit = 50, offset = 0 } = {}) => {
  const items = await Notification.findAll({ where: { userId }, order: [['createdAt', 'DESC']], limit, offset });
  return items;
};

const getUnreadCount = async (userId) => {
  const count = await Notification.count({ where: { userId, read: false } });
  return count;
};

const markAsRead = async (id, userId) => {
  const n = await Notification.findByPk(id);
  if (!n) throw new Error('Notification not found');
  if (Number(n.userId) !== Number(userId)) throw new Error('Not authorized');
  n.read = true;
  await n.save();
  return n;
};

module.exports = { createNotification, getNotificationsForUser, getUnreadCount, markAsRead };
