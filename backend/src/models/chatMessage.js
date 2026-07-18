const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChatMessage = sequelize.define('ChatMessage', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    conversationId: { type: DataTypes.INTEGER, allowNull: false },
    senderId: { type: DataTypes.INTEGER, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: true },
    type: {
        type: DataTypes.ENUM('TEXT', 'IMAGE', 'FILE', 'SYSTEM'),
        allowNull: false,
        defaultValue: 'TEXT'
    },
    attachmentUrl: { type: DataTypes.STRING(1000), allowNull: true },
    attachmentKey: { type: DataTypes.STRING(500), allowNull: true },
    attachmentMime: { type: DataTypes.STRING(100), allowNull: true },
    attachmentSize: { type: DataTypes.INTEGER, allowNull: true },
    attachmentName: { type: DataTypes.STRING(255), allowNull: true },
    status: {
        type: DataTypes.ENUM('SENT', 'DELIVERED', 'READ'),
        allowNull: false,
        defaultValue: 'SENT'
    },
    isRecalled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
    tableName: 'chat_messages',
    timestamps: true,
    updatedAt: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['conversationId', 'createdAt'] },
        { fields: ['senderId'] }
    ]
});

module.exports = ChatMessage;
