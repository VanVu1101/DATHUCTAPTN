const userService = require('../services/user');

const listUsers = async (req, res) => {
    try {
        const users = await userService.listUsers();
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const updateUserRole = async (req, res) => {
    try {
        const user = await userService.updateUserRole(req.params.id, req.body.role);
        res.status(200).json({ success: true, message: 'Đã cập nhật vai trò', data: user });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { listUsers, updateUserRole };
