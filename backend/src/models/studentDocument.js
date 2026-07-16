const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StudentDocument = sequelize.define('StudentDocument', {
    studentId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: 'PROFILE',
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
    tableName: 'student_documents',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

module.exports = StudentDocument;
