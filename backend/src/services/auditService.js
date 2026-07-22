const ReportAudit = require('../models/reportAudit');

const createAudit = async ({ userId = null, action, resourceType = 'report', resourceId = null, meta = null }) => {
  try {
    await ReportAudit.create({ userId, action, resourceType, resourceId, meta });
  } catch (e) {
    console.error('Failed to record audit:', e?.message || e);
  }
};

module.exports = { createAudit };
