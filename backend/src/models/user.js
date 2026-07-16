const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('STUDENT', 'ENTERPRISE', 'ADMIN'),
        defaultValue: 'STUDENT'
    },
    profileImageUrl: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'users', // Tùy chọn: Ép tên bảng viết thường
    timestamps: true,    // Tự động quản lý thời gian tạo/cập nhật
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

module.exports = User;