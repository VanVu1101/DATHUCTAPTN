const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Evaluation = sequelize.define('Evaluation', {
    score: {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: {
            min: 0,
            max: 10
        }
    },
    feedback: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    internshipId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    mentorId: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
    ,
    criteria: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    tableName: 'evaluations',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

module.exports = Evaluation;
