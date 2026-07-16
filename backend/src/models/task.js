const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Task = sequelize.define('Task', {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    deadline: {
        type: DataTypes.DATE
    },
    assignedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true
    },
    taskCode: {
        type: DataTypes.STRING,
        allowNull: true
    },
    priority: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
        defaultValue: 'MEDIUM'
    },
    status: {
        type: DataTypes.ENUM('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'),
        defaultValue: 'TODO'
    },
    internshipId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    studentId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    fileUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    fileName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    fileType: {
        type: DataTypes.STRING,
        allowNull: true
    },
    submissionComment: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    submittedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'tasks',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

module.exports = Task;
