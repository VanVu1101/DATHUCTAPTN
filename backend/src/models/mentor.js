const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Mentor = sequelize.define('Mentor', {
    fullName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING
    },
    companyName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'mentors',
    timestamps: true
});

module.exports = Mentor;
