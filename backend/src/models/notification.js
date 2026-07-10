const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: true },
    type: { type: DataTypes.STRING, allowNull: true },
    data: { type: DataTypes.JSON, allowNull: true },
    read: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
    tableName: 'notifications',
    timestamps: true,
});

module.exports = Notification;
