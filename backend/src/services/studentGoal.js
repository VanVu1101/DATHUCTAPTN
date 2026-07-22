const StudentGoal = require('../models/studentGoal');
const Student = require('../models/student');
const Mentor = require('../models/mentor');
const { Op } = require('sequelize');

const resolveStudentByUser = async (userId) => {
    const student = await Student.findOne({ where: { userId } });
    if (!student) throw new Error('Không tìm thấy hồ sơ sinh viên');
    return student;
};

const resolveMentorByUser = async (userId) => {
    const mentor = await Mentor.findOne({ where: { userId } });
    if (!mentor) throw new Error('Không tìm thấy hồ sơ mentor');
    return mentor;
};

const isMentorOfStudent = async (userId, studentId) => {
    const mentor = await resolveMentorByUser(userId);
    const student = await Student.findByPk(studentId);
    return student && Number(student.mentorId) === Number(mentor.id);
};

const normalizeGoalInput = (data) => {
    const title = typeof data.title === 'string' ? data.title.trim() : '';
    const description = data.description !== undefined && data.description !== null ? String(data.description).trim() : null;
    const dueDate = data.dueDate !== undefined && data.dueDate !== null && data.dueDate !== '' ? String(data.dueDate).trim() : null;
    const link = data.link !== undefined && data.link !== null && data.link !== '' ? String(data.link).trim() : null;

    if (!title) {
        throw new Error('Tiêu đề mục tiêu là bắt buộc');
    }
    if (title.length > 120) {
        throw new Error('Tiêu đề mục tiêu tối đa 120 ký tự');
    }
    if (description && description.length > 500) {
        throw new Error('Mô tả mục tiêu tối đa 500 ký tự');
    }
    if (dueDate) {
        const match = /^\d{4}-\d{2}-\d{2}$/.test(dueDate);
        if (!match) {
            throw new Error('Ngày hết hạn không hợp lệ');
        }
        const parsed = new Date(`${dueDate}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) {
            throw new Error('Ngày hết hạn không hợp lệ');
        }
    }
    if (link) {
        try {
            new URL(link);
        } catch (error) {
            throw new Error('Link tham khảo không hợp lệ');
        }
    }

    return {
        title,
        description,
        dueDate,
        link
    };
};

const getStudentGoals = async (userId, role = 'STUDENT') => {
    if (role === 'ENTERPRISE') {
        const mentor = await resolveMentorByUser(userId);
        const students = await Student.findAll({ where: { mentorId: mentor.id }, attributes: ['id'] });
        const studentIds = students.map((item) => item.id);
        return StudentGoal.findAll({
            where: { studentId: { [Op.in]: studentIds } },
            order: [['status', 'ASC'], ['dueDate', 'ASC'], ['createdAt', 'DESC']]
        });
    }

    const student = await resolveStudentByUser(userId);
    const goals = await StudentGoal.findAll({
        where: { studentId: student.id },
        order: [['status', 'ASC'], ['dueDate', 'ASC'], ['createdAt', 'DESC']]
    });

    return goals;
};

const createStudentGoal = async (userId, data, role = 'STUDENT') => {
    if (role !== 'STUDENT') {
        throw new Error('Chỉ sinh viên được phép tạo mục tiêu');
    }

    const student = await resolveStudentByUser(userId);
    const normalized = normalizeGoalInput(data);

    return StudentGoal.create({
        studentId: student.id,
        title: normalized.title,
        description: normalized.description,
        dueDate: normalized.dueDate,
        status: 'PENDING',
        link: normalized.link,
        attachmentUrl: data.attachmentUrl || null,
        attachmentName: data.attachmentName || null
    });
};

const updateStudentGoal = async (userId, goalId, data, role = 'STUDENT') => {
    const goal = await StudentGoal.findByPk(goalId);
    if (!goal) throw new Error('Không tìm thấy mục tiêu');

    if (role === 'STUDENT') {
        const student = await resolveStudentByUser(userId);
        if (Number(goal.studentId) !== Number(student.id)) {
            throw new Error('Bạn không có quyền chỉnh sửa mục tiêu này');
        }
        if (data.status && !['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(data.status)) {
            throw new Error('Sinh viên chỉ có thể cập nhật trạng thái PENDING, IN_PROGRESS hoặc COMPLETED');
        }
    } else if (role === 'ENTERPRISE') {
        const allowed = await isMentorOfStudent(userId, goal.studentId);
        if (!allowed) {
            throw new Error('Bạn không có quyền duyệt mục tiêu này');
        }
        if (!data.status) {
            throw new Error('Mentor chỉ được cập nhật trạng thái mục tiêu');
        }
        if (!['PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'COMPLETED'].includes(data.status)) {
            throw new Error('Trạng thái mục tiêu không hợp lệ');
        }
    } else {
        throw new Error('Không có quyền cập nhật mục tiêu');
    }

    const updatePayload = {
        status: data.status !== undefined ? data.status : goal.status
    };

    if (role === 'STUDENT') {
        const nextData = {
            title: data.title !== undefined ? data.title : goal.title,
            description: data.description !== undefined ? data.description : goal.description,
            dueDate: data.dueDate !== undefined ? data.dueDate : goal.dueDate,
            link: data.link !== undefined ? data.link : goal.link,
        };
        const normalized = normalizeGoalInput(nextData);
        updatePayload.title = normalized.title;
        updatePayload.description = normalized.description;
        updatePayload.dueDate = normalized.dueDate;
        updatePayload.link = normalized.link;
        updatePayload.attachmentUrl = data.attachmentUrl !== undefined ? data.attachmentUrl : goal.attachmentUrl;
        updatePayload.attachmentName = data.attachmentName !== undefined ? data.attachmentName : goal.attachmentName;
    }

    return goal.update(updatePayload);
};

const deleteStudentGoal = async (userId, goalId, role = 'STUDENT') => {
    const goal = await StudentGoal.findByPk(goalId);
    if (!goal) throw new Error('Không tìm thấy mục tiêu');

    if (role === 'STUDENT') {
        const student = await resolveStudentByUser(userId);
        if (Number(goal.studentId) !== Number(student.id)) {
            throw new Error('Bạn không có quyền xóa mục tiêu này');
        }
    } else if (role === 'ENTERPRISE') {
        const allowed = await isMentorOfStudent(userId, goal.studentId);
        if (!allowed) {
            throw new Error('Bạn không có quyền xóa mục tiêu này');
        }
    } else {
        throw new Error('Không có quyền xóa mục tiêu');
    }

    await goal.destroy();
    return true;
};

module.exports = {
    getStudentGoals,
    createStudentGoal,
    updateStudentGoal,
    deleteStudentGoal
};
