const { Op } = require('sequelize');
const ChatConversation = require('../models/chatConversation');
const ChatMessage = require('../models/chatMessage');
const Internship = require('../models/internship');
const Student = require('../models/student');
const Mentor = require('../models/mentor');
const User = require('../models/user');
const notificationService = require('./notification');
const { getFileUrl } = require('../config/s3');

const CHAT_ROLES = ['STUDENT', 'ENTERPRISE'];
const MESSAGE_TYPES = ['TEXT', 'IMAGE', 'FILE'];

const chatError = (message, code = 'CHAT_BAD_REQUEST', status = 400) => {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    return error;
};

const assertChatRole = (user) => {
    if (!user || !CHAT_ROLES.includes(user.role)) {
        throw chatError('Tài khoản không được phép sử dụng chat.', 'CHAT_FORBIDDEN', 403);
    }
};

const findAssignments = async (user) => {
    assertChatRole(user);

    if (user.role === 'STUDENT') {
        const student = await Student.findOne({ where: { userId: user.id } });
        if (!student) return [];

        const internships = await Internship.findAll({
            where: { studentId: student.id },
            order: [['updatedAt', 'DESC']]
        });

        return Promise.all(internships.map(async (internship) => {
            const mentor = await Mentor.findByPk(internship.mentorId);
            if (!mentor?.userId || Number(mentor.userId) === Number(user.id)) return null;
            const mentorUser = await User.findByPk(mentor.userId);
            if (!mentorUser || mentorUser.role !== 'ENTERPRISE') return null;
            let mentorAvatar = mentorUser.profileImageUrl || null;
            if (mentorAvatar && !String(mentorAvatar).startsWith('http')) {
                try {
                    mentorAvatar = await getFileUrl(mentorAvatar);
                } catch (error) {
                    mentorAvatar = mentorUser.profileImageUrl || null;
                }
            }
            return {
                internship,
                student,
                studentUserId: Number(user.id),
                mentor,
                mentorUserId: Number(mentor.userId),
                contact: {
                    id: Number(mentor.userId),
                    name: mentor.fullName || mentorUser.email,
                    email: mentorUser.email,
                    avatar: mentorAvatar,
                    role: 'ENTERPRISE',
                    companyName: mentor.companyName || ''
                }
            };
        })).then((items) => items.filter(Boolean));
    }

    const mentor = await Mentor.findOne({ where: { userId: user.id } });
    if (!mentor) return [];

    const internships = await Internship.findAll({
        where: { mentorId: mentor.id },
        order: [['updatedAt', 'DESC']]
    });

    return Promise.all(internships.map(async (internship) => {
        const student = await Student.findByPk(internship.studentId);
        if (!student?.userId) return null;
        const studentUser = await User.findByPk(student.userId);
        if (!studentUser) return null;
        return {
            internship,
            student,
            studentUserId: Number(student.userId),
            mentor,
            mentorUserId: Number(user.id),
            contact: {
                id: Number(student.userId),
                name: student.fullName || studentUser.email,
                email: studentUser.email,
                avatar: student.profileImageUrl || studentUser.profileImageUrl || null,
                role: 'STUDENT',
                studentCode: student.studentCode || ''
            }
        };
    })).then((items) => items.filter(Boolean));
};

const unreadCountForConversation = async (conversation, userId) => (
    ChatMessage.count({
        where: {
            conversationId: conversation.id,
            senderId: { [Op.ne]: userId },
            status: { [Op.ne]: 'READ' }
        }
    })
);

const serializeConversation = async (conversation, assignment, userId) => ({
    id: conversation.id,
    internshipId: conversation.internshipId,
    status: conversation.status,
    lastMessageAt: conversation.lastMessageAt,
    lastMessagePreview: conversation.lastMessagePreview,
    unreadCount: await unreadCountForConversation(conversation, userId),
    contact: assignment.contact
});

const listConversations = async (user) => {
    const assignments = await findAssignments(user);

    const items = await Promise.all(assignments.map(async (assignment) => {
        const archived = ['COMPLETED', 'FAILED'].includes(assignment.internship.status);
        const [conversation] = await ChatConversation.findOrCreate({
            where: {
                internshipId: assignment.internship.id,
                studentUserId: assignment.studentUserId,
                mentorUserId: assignment.mentorUserId
            },
            defaults: { status: archived ? 'ARCHIVED' : 'ACTIVE' }
        });
        if (archived && conversation.status === 'ACTIVE') {
            conversation.status = 'ARCHIVED';
            await conversation.save();
        }
        return serializeConversation(conversation, assignment, user.id);
    }));

    return Promise.all(items).then((rows) => rows.sort((a, b) => {
        const left = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const right = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return right - left;
    }));
};

const getConversationForUser = async (conversationId, userId) => {
    const conversation = await ChatConversation.findByPk(conversationId);
    if (!conversation) {
        throw chatError('Không tìm thấy cuộc hội thoại.', 'CHAT_NOT_FOUND', 404);
    }
    if (![conversation.studentUserId, conversation.mentorUserId].some(
        (id) => Number(id) === Number(userId)
    )) {
        throw chatError('Bạn không thuộc cuộc hội thoại này.', 'CHAT_FORBIDDEN', 403);
    }
    return conversation;
};

const listMessages = async ({ conversationId, userId, beforeId, limit = 50 }) => {
    await getConversationForUser(conversationId, userId);
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const where = { conversationId };
    if (beforeId) where.id = { [Op.lt]: Number(beforeId) };

    const rows = await ChatMessage.findAll({
        where,
        order: [['id', 'DESC']],
        limit: safeLimit
    });
    return Promise.all(rows.reverse().map(async (row) => {
        const message = row.get({ plain: true });
        if (message.attachmentKey) {
            message.attachmentUrl = await getFileUrl(message.attachmentKey);
        }
        return message;
    }));
};

const validateMessage = ({ content, type, attachmentUrl }) => {
    const normalizedType = String(type || 'TEXT').toUpperCase();
    if (!MESSAGE_TYPES.includes(normalizedType)) {
        throw chatError('Loại tin nhắn không hợp lệ.');
    }
    const text = String(content || '').trim();
    if (text.length > 2000) {
        throw chatError('Tin nhắn không được vượt quá 2000 ký tự.');
    }
    if (!text && !attachmentUrl) {
        throw chatError('Tin nhắn không được để trống.');
    }
    if (normalizedType !== 'TEXT' && !attachmentUrl) {
        throw chatError('Tin nhắn đính kèm chưa có tệp.');
    }
    return { text, normalizedType };
};

const sendMessage = async ({
    conversationId,
    userId,
    content,
    type,
    attachmentUrl,
    attachmentKey,
    attachmentMime,
    attachmentSize,
    attachmentName
}) => {
    const conversation = await getConversationForUser(conversationId, userId);
    if (conversation.status !== 'ACTIVE') {
        throw chatError('Cuộc hội thoại đã đóng, bạn chỉ có thể xem lịch sử.', 'CHAT_ARCHIVED', 409);
    }

    const { text, normalizedType } = validateMessage({ content, type, attachmentUrl });
    const message = await ChatMessage.create({
        conversationId: conversation.id,
        senderId: userId,
        content: text || null,
        type: normalizedType,
        attachmentUrl: attachmentUrl || null,
        attachmentKey: attachmentKey || null,
        attachmentMime: attachmentMime || null,
        attachmentSize: attachmentSize || null,
        attachmentName: attachmentName || null,
        status: 'SENT'
    });

    conversation.lastMessageAt = message.createdAt;
    conversation.lastMessagePreview = normalizedType === 'TEXT'
        ? text.slice(0, 255)
        : `📎 ${attachmentName || 'Tệp đính kèm'}`;
    await conversation.save();

    const recipientId = Number(userId) === Number(conversation.studentUserId)
        ? conversation.mentorUserId
        : conversation.studentUserId;

    notificationService.createNotification({
        userId: recipientId,
        title: 'Tin nhắn mới',
        message: conversation.lastMessagePreview,
        type: 'CHAT_MESSAGE',
        data: { conversationId: conversation.id, messageId: message.id }
    }).catch((error) => console.error('Chat notification error:', error.message));

    return { message, recipientId };
};

const markRead = async ({ conversationId, userId, lastMessageId = null }) => {
    const conversation = await getConversationForUser(conversationId, userId);
    const where = {
        conversationId,
        senderId: { [Op.ne]: userId },
        status: { [Op.ne]: 'READ' }
    };
    if (lastMessageId) where.id = { [Op.lte]: Number(lastMessageId) };
    await ChatMessage.update({ status: 'READ' }, { where });

    if (Number(userId) === Number(conversation.studentUserId)) {
        conversation.studentLastReadAt = new Date();
    } else {
        conversation.mentorLastReadAt = new Date();
    }
    await conversation.save();
    return { conversationId: Number(conversationId), userId: Number(userId), lastMessageId };
};

const getUnreadCount = async (userId) => {
    const conversations = await ChatConversation.findAll({
        where: {
            [Op.or]: [{ studentUserId: userId }, { mentorUserId: userId }]
        },
        attributes: ['id']
    });
    if (!conversations.length) return 0;
    return ChatMessage.count({
        where: {
            conversationId: { [Op.in]: conversations.map((item) => item.id) },
            senderId: { [Op.ne]: userId },
            status: { [Op.ne]: 'READ' }
        }
    });
};

const getRecipientId = (conversation, senderId) => (
    Number(senderId) === Number(conversation.studentUserId)
        ? Number(conversation.mentorUserId)
        : Number(conversation.studentUserId)
);

module.exports = {
    chatError,
    listConversations,
    getConversationForUser,
    listMessages,
    sendMessage,
    markRead,
    getUnreadCount,
    getRecipientId
};
