const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Report = sequelize.define('Report', {
    weekNumber: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fileUrl: {
        type: DataTypes.STRING
    },
    fileName: {
        type: DataTypes.STRING
    },
    fileType: {
        type: DataTypes.STRING
    },
    weeklyReportId: {
        type: DataTypes.INTEGER
    },
    status: {
        type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'REVIEWED', 'REJECTED'),
        defaultValue: 'DRAFT'
    },
    reviewerNote: {
        type: DataTypes.TEXT
    },
    studentId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    internshipId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'reports',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

module.exports = Report;
