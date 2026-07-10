const authService = require('../services/auth');

const register = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const newUser = await authService.registerUser(email, password, role);
        res.status(201).json({ success: true, message: 'Đăng ký thành công', data: newUser });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.loginUser(email, password);
        res.status(200).json({ success: true, message: 'Đăng nhập thành công', data: result });
    } catch (error) {
        res.status(401).json({ success: false, message: error.message });
    }
};

const changePassword = async (req, res) => {
    try {
        await authService.changePassword(req.user.id, req.body.oldPassword, req.body.newPassword);
        res.status(200).json({ success: true, message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const forgotPassword = async (req, res) => {
    try {
        await authService.resetPasswordByEmail(req.body.email, req.body.newPassword);
        res.status(200).json({ success: true, message: 'Đặt lại mật khẩu thành công' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { register, login, changePassword, forgotPassword };