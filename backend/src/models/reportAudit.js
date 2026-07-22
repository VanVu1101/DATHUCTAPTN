const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReportAudit = sequelize.define('ReportAudit', {
  userId: { type: DataTypes.INTEGER, allowNull: true },
  action: { type: DataTypes.STRING, allowNull: false },
  resourceType: { type: DataTypes.STRING, allowNull: false },
  resourceId: { type: DataTypes.INTEGER, allowNull: true },
  meta: { type: DataTypes.JSON, allowNull: true }
}, {
  tableName: 'report_audits',
  timestamps: true,
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci'
});

module.exports = ReportAudit;
