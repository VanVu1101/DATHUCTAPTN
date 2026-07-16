const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InternshipPeriod = sequelize.define('InternshipPeriod', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    academicYear: {
        type: DataTypes.STRING,
        allowNull: false
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'internship_periods',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

module.exports = InternshipPeriod;
