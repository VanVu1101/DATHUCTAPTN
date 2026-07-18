const path = require('path');
const chatService = require('../services/chat');
const { uploadFile } = require('../config/s3');

const respondError = (res, error) => {
    const status = error.status || 500;
    return res.status(status).json({
        success: false,
        code: error.code || 'CHAT_INTERNAL_ERROR',
        message: status === 500 ? 'Không thể xử lý yêu cầu chat.' : error.message
    });
};

const getConversations = async (req, res) => {
    try {
        const data = await chatService.listConversations(req.user);
        return res.json({ success: true, data });
    } catch (error) {
        console.error('Get chat conversations error:', error);
        return respondError(res, error);
    }
};

const getMessages = async (req, res) => {
    try {
        const data = await chatService.listMessages({
            conversationId: req.params.id,
            userId: req.user.id,
            beforeId: req.query.beforeId,
            limit: req.query.limit
        });
        return res.json({ success: true, data });
    } catch (error) {
        return respondError(res, error);
    }
};

const sendMessage = async (req, res) => {
    try {
        const result = await chatService.sendMessage({
            conversationId: req.params.id,
            userId: req.user.id,
            ...req.body
        });
        const io = req.app.get('io');
        if (io) io.to(`user:${result.recipientId}`).emit('message:new', result.message);
        return res.status(201).json({ success: true, data: result.message });
    } catch (error) {
        return respondError(res, error);
    }
};

const markRead = async (req, res) => {
    try {
        const data = await chatService.markRead({
            conversationId: req.params.id,
            userId: req.user.id,
            lastMessageId: req.body.lastMessageId
        });
        const conversation = await chatService.getConversationForUser(req.params.id, req.user.id);
        const recipientId = chatService.getRecipientId(conversation, req.user.id);
        const io = req.app.get('io');
        if (io) io.to(`user:${recipientId}`).emit('message:read', data);
        return res.json({ success: true, data });
    } catch (error) {
        return respondError(res, error);
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const count = await chatService.getUnreadCount(req.user.id);
        return res.json({ success: true, data: { count } });
    } catch (error) {
        return respondError(res, error);
    }
};

const uploadAttachment = async (req, res) => {
    try {
        if (!req.file) {
            throw chatService.chatError('Vui lòng chọn tệp đính kèm.', 'CHAT_ATTACHMENT_INVALID');
        }
        if (req.file.mimetype.startsWith('image/') && req.file.size > 5 * 1024 * 1024) {
            throw chatService.chatError(
                'Ảnh đính kèm không được vượt quá 5 MB.',
                'CHAT_ATTACHMENT_INVALID'
            );
        }
        const conversation = await chatService.getConversationForUser(
            req.body.conversationId,
            req.user.id
        );
        const safeName = path.basename(req.file.originalname).replace(/[^\w.\-() ]/g, '_');
        const uploaded = await uploadFile({
            fileBuffer: req.file.buffer,
            fileName: safeName,
            contentType: req.file.mimetype,
            folder: `chat-attachments/${conversation.id}`,
            returnMetadata: true
        });
        return res.status(201).json({
            success: true,
            data: {
                url: uploaded.url,
                key: uploaded.key,
                name: safeName,
                mime: req.file.mimetype,
                size: req.file.size,
                type: req.file.mimetype.startsWith('image/') ? 'IMAGE' : 'FILE'
            }
        });
    } catch (error) {
        console.error('Chat attachment upload error:', error);
        return respondError(res, error);
    }
};

module.exports = {
    getConversations,
    getMessages,
    sendMessage,
    markRead,
    getUnreadCount,
    uploadAttachment
};
