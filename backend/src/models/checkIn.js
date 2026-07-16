const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CheckIn = sequelize.define('CheckIn', {
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    checkOutTime: {
        type: DataTypes.TIME,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('PRESENT', 'LATE', 'ABSENT'),
        defaultValue: 'PRESENT'
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    internshipId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: 'check_ins',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

module.exports = CheckIn;
