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
    if (!data.title || !String(data.title).trim()) throw new Error('Tiêu đề mục tiêu là bắt buộc');

    return StudentGoal.create({
        studentId: student.id,
        title: String(data.title).trim(),
        description: data.description || null,
        dueDate: data.dueDate || null,
        status: 'PENDING',
        link: data.link || null,
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
        updatePayload.title = data.title !== undefined ? String(data.title).trim() : goal.title;
        updatePayload.description = data.description !== undefined ? data.description : goal.description;
        updatePayload.dueDate = data.dueDate !== undefined ? data.dueDate : goal.dueDate;
        updatePayload.link = data.link !== undefined ? data.link : goal.link;
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
