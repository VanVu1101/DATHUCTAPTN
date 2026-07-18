const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Meeting = sequelize.define('Meeting', {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    agenda: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    meetingDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    meetingTime: {
        type: DataTypes.STRING,
        allowNull: true
    },
    endTime: {
        type: DataTypes.STRING,
        allowNull: true
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('PLANNED', 'DONE', 'CANCELLED'),
        defaultValue: 'PLANNED'
    },
    audience: {
        type: DataTypes.ENUM('ALL_STUDENTS', 'SPECIFIC_PERIOD'),
        defaultValue: 'ALL_STUDENTS'
    },
    periodId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'meetings',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

module.exports = Meeting;
