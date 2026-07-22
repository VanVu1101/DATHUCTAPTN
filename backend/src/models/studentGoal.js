const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StudentGoal = sequelize.define('StudentGoal', {
    studentId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'COMPLETED'),
        allowNull: false,
        defaultValue: 'PENDING'
    },
    link: {
        type: DataTypes.STRING,
        allowNull: true
    },
    attachmentUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    attachmentName: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'student_goals',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

module.exports = StudentGoal;
