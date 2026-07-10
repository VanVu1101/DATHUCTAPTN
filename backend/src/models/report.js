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
        type: DataTypes.ENUM('SUBMITTED', 'APPROVED', 'REJECTED'),
        defaultValue: 'SUBMITTED'
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
    timestamps: true
});

module.exports = Report;
