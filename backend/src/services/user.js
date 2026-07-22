const User = require('../models/user');

const VALID_USER_ROLES = ['STUDENT', 'ENTERPRISE', 'ADMIN'];

const listUsers = async () => {
    const users = await User.findAll({
        attributes: ['id', 'email', 'role', 'createdAt', 'updatedAt'],
        order: [['createdAt', 'DESC']]
    });

    return users.map((user) => user.get({ plain: true }));
};

const updateUserRole = async (userId, role) => {
    if (!userId) {
        throw new Error('Thiếu id người dùng');
    }

    if (!VALID_USER_ROLES.includes(role)) {
        throw new Error('Vai trò không hợp lệ');
    }

    const user = await User.findByPk(userId);
    if (!user) {
        throw new Error('Không tìm thấy người dùng');
    }

    user.role = role;
    await user.save();

    return user.get({ plain: true });
};

module.exports = { listUsers, updateUserRole, VALID_USER_ROLES };
