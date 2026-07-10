const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Position = sequelize.define('Position', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    }
}, {
    tableName: 'positions',
    timestamps: true
});

module.exports = Position;
