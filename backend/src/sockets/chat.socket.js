const jwt = require('jsonwebtoken');
const chatService = require('../services/chat');

const rateWindows = new Map();

const canSend = (userId) => {
    const now = Date.now();
    const recent = (rateWindows.get(userId) || []).filter((time) => now - time < 60_000);
    if (recent.length >= 30) {
        rateWindows.set(userId, recent);
        return false;
    }
    recent.push(now);
    rateWindows.set(userId, recent);
    return true;
};

const publicError = (error) => ({
    code: error.code || 'CHAT_INTERNAL_ERROR',
    message: error.status === 500 ? 'Không thể xử lý yêu cầu chat.' : error.message
});

module.exports = (io) => {
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token
                || socket.handshake.headers.authorization?.split(' ')[1];
            if (!token) return next(new Error('CHAT_UNAUTHORIZED'));
            const user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
            if (!['STUDENT', 'ENTERPRISE'].includes(user.role)) {
                return next(new Error('CHAT_FORBIDDEN'));
            }
            socket.user = user;
            return next();
        } catch (_error) {
            return next(new Error('CHAT_UNAUTHORIZED'));
        }
    });

    io.on('connection', (socket) => {
        const userId = Number(socket.user.id);
        socket.join(`user:${userId}`);

        socket.on('conversation:join', async ({ conversationId } = {}, callback = () => {}) => {
            try {
                await chatService.getConversationForUser(conversationId, userId);
                socket.join(`conversation:${conversationId}`);
                callback({ success: true });
            } catch (error) {
                callback({ success: false, error: publicError(error) });
            }
        });

        socket.on('message:send', async (payload = {}, callback = () => {}) => {
            try {
                if (!canSend(userId)) {
                    throw chatService.chatError(
                        'Bạn đang gửi tin quá nhanh. Vui lòng thử lại sau.',
                        'CHAT_RATE_LIMIT',
                        429
                    );
                }
                const result = await chatService.sendMessage({ ...payload, userId });
                io.to(`user:${result.recipientId}`).emit('message:new', result.message);
                callback({ success: true, data: result.message });
            } catch (error) {
                callback({ success: false, error: publicError(error) });
            }
        });

        socket.on('message:read', async (payload = {}, callback = () => {}) => {
            try {
                const data = await chatService.markRead({ ...payload, userId });
                const conversation = await chatService.getConversationForUser(
                    payload.conversationId,
                    userId
                );
                const recipientId = chatService.getRecipientId(conversation, userId);
                io.to(`user:${recipientId}`).emit('message:read', data);
                callback({ success: true, data });
            } catch (error) {
                callback({ success: false, error: publicError(error) });
            }
        });

        const broadcastTyping = async (payload = {}, isTyping) => {
            try {
                const conversation = await chatService.getConversationForUser(
                    payload.conversationId,
                    userId
                );
                const recipientId = chatService.getRecipientId(conversation, userId);
                io.to(`user:${recipientId}`).emit('typing:update', {
                    conversationId: Number(payload.conversationId),
                    userId,
                    isTyping
                });
            } catch (_error) {
                // Ignore unauthorized typing events.
            }
        };

        socket.on('typing:start', (payload) => broadcastTyping(payload, true));
        socket.on('typing:stop', (payload) => broadcastTyping(payload, false));
    });
};
