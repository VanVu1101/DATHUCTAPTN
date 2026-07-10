const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

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
        role: role || 'STUDENT'
    });

    const token = generateToken(newUser);
    return {
        user: { id: newUser.id, email: newUser.email, role: newUser.role },
        token
    };
};

const loginUser = async (email, password) => {
    if (!email || !password) {
        throw new Error('Vui lòng nhập đầy đủ email và mật khẩu');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
        throw new Error('Email không tồn tại!');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Mật khẩu không chính xác!');
    }

    const token = generateToken(user);

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

module.exports = { registerUser, loginUser, changePassword, resetPasswordByEmail };