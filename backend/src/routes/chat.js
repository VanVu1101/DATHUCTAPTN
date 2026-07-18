const express = require('express');
const multer = require('multer');
const { verifyToken, checkRole } = require('../middlewares/auth');
const chatController = require('../controllers/chat');

const router = express.Router();
const messageWindows = new Map();
const uploadWindows = new Map();
const allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        if (!allowedMimeTypes.has(file.mimetype)) {
            const error = new Error('Chỉ hỗ trợ JPG, PNG, WEBP hoặc PDF.');
            error.code = 'CHAT_ATTACHMENT_INVALID';
            error.status = 400;
            return callback(error);
        }
        return callback(null, true);
    }
});

const rateLimit = (store, maxRequests, windowMs, message) => (req, res, next) => {
    const now = Date.now();
    const key = Number(req.user.id);
    const recent = (store.get(key) || []).filter((time) => now - time < windowMs);
    if (recent.length >= maxRequests) {
        store.set(key, recent);
        return res.status(429).json({
            success: false,
            code: 'CHAT_RATE_LIMIT',
            message
        });
    }
    recent.push(now);
    store.set(key, recent);
    return next();
};

router.use(verifyToken, checkRole(['STUDENT', 'ENTERPRISE']));

router.get('/conversations', chatController.getConversations);
router.get('/conversations/:id/messages', chatController.getMessages);
router.post(
    '/conversations/:id/messages',
    rateLimit(messageWindows, 30, 60_000, 'Bạn đang gửi tin quá nhanh. Vui lòng thử lại sau.'),
    chatController.sendMessage
);
router.post('/conversations/:id/read', chatController.markRead);
router.get('/unread-count', chatController.getUnreadCount);
router.post(
    '/attachments',
    rateLimit(uploadWindows, 10, 60 * 60_000, 'Bạn đã tải lên quá nhiều tệp. Vui lòng thử lại sau.'),
    upload.single('file'),
    chatController.uploadAttachment
);

router.use((error, _req, res, _next) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            code: 'CHAT_ATTACHMENT_INVALID',
            message: 'Tệp đính kèm không được vượt quá 10 MB.'
        });
    }
    return res.status(error.status || 400).json({
        success: false,
        code: error.code || 'CHAT_ATTACHMENT_INVALID',
        message: error.message || 'Tệp đính kèm không hợp lệ.'
    });
});

module.exports = router;
