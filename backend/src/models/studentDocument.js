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
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'HỒ SƠ'
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
    timestamps: true
});

module.exports = StudentDocument;
