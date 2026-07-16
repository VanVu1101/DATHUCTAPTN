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
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: 'DOCUMENT',
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci'
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
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

module.exports = PeriodDocument;