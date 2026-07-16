const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WeeklyReport = sequelize.define('WeeklyReport', {
    weekNumber: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    periodId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('ACTIVE', 'ARCHIVED'),
        defaultValue: 'ACTIVE'
    }
}, {
    tableName: 'weekly_reports',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

module.exports = WeeklyReport;