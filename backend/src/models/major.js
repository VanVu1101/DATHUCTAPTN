const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Major = sequelize.define('Major', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'majors',
    timestamps: true
});

module.exports = Major;