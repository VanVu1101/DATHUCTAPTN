const NotificationDeliveryLog = require('../models/notificationDeliveryLog');

const getDeliveryLogs = async ({ limit = 100, offset = 0, provider, status, event } = {}) => {
  const where = {};
  if (provider) where.provider = provider;
  if (status) where.status = status;
  if (event) where.event = event;

  return NotificationDeliveryLog.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset
  });
};

module.exports = { getDeliveryLogs };
