const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Student = sequelize.define('Student', {
    studentCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    fullName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    className: {
        type: DataTypes.STRING,
        allowNull: true
    },
    majorName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    enterpriseName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    mentorName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    mentorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'mentors',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'COMPLETED'),
        defaultValue: 'ACTIVE'
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    address: {
        type: DataTypes.STRING,
        allowNull: true
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    linkedin: {
        type: DataTypes.STRING,
        allowNull: true
    },
    university: {
        type: DataTypes.STRING,
        allowNull: true
    },
    groupName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    birthDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    headline: {
        type: DataTypes.STRING,
        allowNull: true
    },
    emergencyContact: {
        type: DataTypes.STRING,
        allowNull: true
    },
    emergencyPhone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    profileImageUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    technicalSkills: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    softSkills: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    languages: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users', // Tên bảng users trong DB
            key: 'id'
        }
    },
    majorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'majors', // Tên bảng majors trong DB
            key: 'id'
        }
    },
    periodId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'internship_periods',
            key: 'id'
        }
    }
}, {
    tableName: 'students',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

module.exports = Student;