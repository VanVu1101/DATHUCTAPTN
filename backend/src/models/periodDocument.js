const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PeriodDocument = sequelize.define('PeriodDocument', {
    periodId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    uploadedBy: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'TÀI LIỆU'
    },
    fileName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fileUrl: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fileType: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'period_documents',
    timestamps: true
});

module.exports = PeriodDocument;