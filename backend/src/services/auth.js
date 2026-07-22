const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user');
const { sendPasswordResetEmail } = require('../infrastructure/mail');

const passwordResetTokens = new Map();

const isStrongPassword = (password) => {
    if (!password || password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/[0-9]/.test(password)) return false;
    if (!/[^A-Za-z0-9]/.test(password)) return false;
    return true;
};

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET || 'dev-secret',
        { expiresIn: '1d' }
    );
};

const registerUser = async (email, password, role) => {
    if (!email || !password) {
        throw new Error('Vui lòng nhập email và mật khẩu');
    }

    if (!isStrongPassword(password)) {
        throw new Error('Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
        throw new Error('Email này đã được sử dụng!');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
        email: normalizedEmail,
        password: hashedPassword,
        role: role && ['STUDENT', 'ENTERPRISE', 'ADMIN'].includes(role) ? role : 'STUDENT'
    });

    const token = generateToken(newUser);
    return {
        user: { id: newUser.id, email: newUser.email, role: newUser.role },
        token
    };
};

const LoginHistory = require('../models/loginHistory');

const loginUser = async (email, password, req = null) => {
    if (!email || !password) {
        throw new Error('Vui lòng nhập đầy đủ email và mật khẩu');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
        if (req) {
            await LoginHistory.create({
                userId: null,
                loginStatus: 'FAILED',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent') || null,
                deviceName: req.body.deviceName || null,
                failureReason: 'USER_NOT_FOUND'
            }).catch(() => {});
        }
        throw new Error('Email không tồn tại!');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        if (req) {
            await LoginHistory.create({
                userId: user.id,
                loginStatus: 'FAILED',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent') || null,
                deviceName: req.body.deviceName || null,
                failureReason: 'INVALID_PASSWORD'
            }).catch(() => {});
        }
        throw new Error('Mật khẩu không chính xác!');
    }

    const token = generateToken(user);
    if (req) {
        await LoginHistory.create({
            userId: user.id,
            loginStatus: 'SUCCESS',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent') || null,
            deviceName: req.body.deviceName || null
        }).catch(() => {});
    }

    return { user: { id: user.id, email: user.email, role: user.role }, token };
};

const changePassword = async (userId, oldPassword, newPassword) => {
    if (!oldPassword || !newPassword) {
        throw new Error('Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới');
    }

    const user = await User.findByPk(userId);
    if (!user) {
        throw new Error('Không tìm thấy tài khoản');
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
        throw new Error('Mật khẩu cũ không chính xác');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return true;
};

const resetPasswordByEmail = async (email, newPassword) => {
    if (!email || !newPassword) {
        throw new Error('Vui lòng nhập email và mật khẩu mới');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
        throw new Error('Email không tồn tại');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return true;
};

const requestPasswordReset = async (email) => {
    if (!email) {
        throw new Error('Vui lòng nhập email');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
        throw new Error('Email không tồn tại');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    passwordResetTokens.set(resetToken, {
        email: normalizedEmail,
        expiresAt: Date.now() + 15 * 60 * 1000
    });

    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?email=${encodeURIComponent(normalizedEmail)}&token=${resetToken}`;

    const result = await sendPasswordResetEmail(normalizedEmail, resetLink);

    if (!result.sent) {
        return {
            success: true,
            message: 'Yêu cầu đặt lại mật khẩu đã được ghi nhận. Vui lòng dùng liên kết tạm thời trong log server.',
            resetLink
        };
    }

    return {
        success: true,
        message: 'Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.'
    };
};

const resetPasswordWithToken = async ({ email, token, newPassword }) => {
    if (!email || !token || !newPassword) {
        throw new Error('Vui lòng nhập đầy đủ email, token và mật khẩu mới');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const record = passwordResetTokens.get(token);
    if (!record || record.email !== normalizedEmail) {
        throw new Error('Token không hợp lệ');
    }

    if (Date.now() > record.expiresAt) {
        passwordResetTokens.delete(token);
        throw new Error('Token đã hết hạn');
    }

    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
        throw new Error('Email không tồn tại');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    passwordResetTokens.delete(token);
    return true;
};

module.exports = { registerUser, loginUser, changePassword, resetPasswordByEmail, requestPasswordReset, resetPasswordWithToken };

const getLoginHistory = async (userId) => {
    return LoginHistory.findAll({ where: { userId }, order: [['loginAt', 'DESC']], limit: 50 });
};

module.exports = { registerUser, loginUser, changePassword, resetPasswordByEmail, requestPasswordReset, resetPasswordWithToken, getLoginHistory };