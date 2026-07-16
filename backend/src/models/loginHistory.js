const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LoginHistory = sequelize.define('LoginHistory', {
  userId: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
  },
  loginStatus: {
    type: DataTypes.ENUM('SUCCESS', 'FAILED'),
    defaultValue: 'SUCCESS',
  },
  loginAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  logoutAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  deviceName: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  failureReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
  }
}, {
  tableName: 'login_histories',
  timestamps: true,
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci'
});

module.exports = LoginHistory;
