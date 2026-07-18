const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChatConversation = sequelize.define('ChatConversation', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    internshipId: { type: DataTypes.INTEGER, allowNull: false },
    studentUserId: { type: DataTypes.INTEGER, allowNull: false },
    mentorUserId: { type: DataTypes.INTEGER, allowNull: false },
    lastMessageAt: { type: DataTypes.DATE, allowNull: true },
    lastMessagePreview: { type: DataTypes.STRING(255), allowNull: true },
    studentLastReadAt: { type: DataTypes.DATE, allowNull: true },
    mentorLastReadAt: { type: DataTypes.DATE, allowNull: true },
    status: {
        type: DataTypes.ENUM('ACTIVE', 'ARCHIVED', 'LOCKED'),
        allowNull: false,
        defaultValue: 'ACTIVE'
    }
}, {
    tableName: 'chat_conversations',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        {
            unique: true,
            fields: ['internshipId', 'studentUserId', 'mentorUserId'],
            name: 'chat_conversation_assignment_unique'
        },
        { fields: ['studentUserId', 'lastMessageAt'] },
        { fields: ['mentorUserId', 'lastMessageAt'] }
    ]
});

module.exports = ChatConversation;
