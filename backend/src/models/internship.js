const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Internship = sequelize.define('Internship', {
    status: {
        type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'),
        defaultValue: 'PENDING'
    },
    studentId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    periodId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    positionId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    mentorId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: 'internships',
    timestamps: true
});

module.exports = Internship;
