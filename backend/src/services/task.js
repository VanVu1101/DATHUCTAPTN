const Task = require('../models/task');
const Student = require('../models/student');
const Internship = require('../models/internship');
const InternshipPeriod = require('../models/internshipPeriod');
const User = require('../models/user');
const Mentor = require('../models/mentor');
const Notification = require('../models/notification');

const getTaskById = async (id) => {
    const task = await Task.findByPk(id, {
        include: [
            { model: Student, attributes: ['id', 'fullName', 'studentCode'] },
            { model: Internship, include: [{ model: InternshipPeriod, attributes: ['id', 'name'] }] }
        ]
    });
    if (!task) {
        throw new Error('Không tìm thấy nhiệm vụ');
    }
    return task;
};

const getTasks = async (filters = {}) => {
    const where = {};
    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.internshipId) where.internshipId = filters.internshipId;
    if (filters.status) where.status = filters.status;

    const include = [
        { model: Student, attributes: ['id', 'fullName', 'studentCode'] },
        {
            model: Internship,
            required: false,
            include: [{ model: InternshipPeriod, attributes: ['id', 'name'] }],
            where: filters.periodId ? { periodId: filters.periodId } : undefined
        }
    ];

    return Task.findAll({
        where,
        include,
        order: [['deadline', 'ASC'], ['createdAt', 'DESC']]
    });
};

const getMyTasks = async (userId, periodId = null, status = null) => {
    const student = await Student.findOne({ where: { userId } });
    if (!student) {
        throw new Error('Không tìm thấy sinh viên');
    }

    const where = { studentId: student.id };
    if (status) where.status = status;
    const include = [
        { model: Student, attributes: ['id', 'fullName', 'studentCode'] },
        {
            model: Internship,
            required: false,
            include: [{ model: InternshipPeriod, attributes: ['id', 'name'] }],
            where: periodId ? { periodId } : undefined
        }
    ];

    return Task.findAll({
        where,
        include,
        order: [['deadline', 'ASC'], ['createdAt', 'DESC']]
    });
};

const createTask = async (data) => {
    if (!data.title) throw new Error('Tiêu đề nhiệm vụ là bắt buộc');
    if (!data.studentId) throw new Error('Sinh viên nhận nhiệm vụ là bắt buộc');

    const student = await Student.findByPk(data.studentId);
    if (!student) {
        throw new Error('Không tìm thấy sinh viên này');
    }

    let internshipId = data.internshipId;
    if (!internshipId) {
        const internship = await Internship.findOne({ where: { studentId: student.id }, order: [['createdAt', 'DESC']] });
        internshipId = internship?.id || null;
    }

    if (!internshipId) {
        // create a default internship assignment for the student if possible
        let position = await Internship.findOne({ where: { name: 'Chưa phân công' } }).catch(() => null);
        // The project uses a separate Position model; create/find that
        const Position = require('../models/position');
        position = await Position.findOne({ where: { name: 'Chưa phân công' } });
        if (!position) {
            position = await Position.create({ name: 'Chưa phân công', description: 'Vị trí mặc định cho sinh viên chưa phân công' });
        }

        // find or create a mentor placeholder
        let mentor = null;
        if (student.userId) {
            mentor = await Mentor.findOne({ where: { userId: student.userId } });
        }
        if (!mentor) {
            mentor = await Mentor.create({ fullName: 'Chưa phân công', companyName: 'Chưa phân công', userId: student.userId });
        }

        const createdInternship = await Internship.create({
            studentId: student.id,
            periodId: data.periodId || student.periodId || null,
            positionId: position.id,
            mentorId: mentor.id,
            status: 'IN_PROGRESS'
        });

        internshipId = createdInternship.id;
    }

    return Task.create({
        title: data.title,
        description: data.description || '',
        deadline: data.deadline || null,
        assignedAt: data.assignedAt || null,
        category: data.category || null,
        taskCode: data.taskCode || null,
        priority: data.priority || 'MEDIUM',
        status: data.status || 'TODO',
        internshipId,
        studentId: student.id
    });
};

const updateTask = async (id, data) => {
    const task = await getTaskById(id);
    return task.update({
        title: data.title ?? task.title,
        description: data.description ?? task.description,
        deadline: data.deadline ?? task.deadline,
        assignedAt: data.assignedAt ?? task.assignedAt,
        category: data.category ?? task.category,
        taskCode: data.taskCode ?? task.taskCode,
        priority: data.priority ?? task.priority,
        status: data.status ?? task.status,
        studentId: data.studentId ?? task.studentId
    });
};

const deleteTask = async (id) => {
    const task = await getTaskById(id);
    await task.destroy();
    return true;
};

const submitTask = async (taskId, userId, payload = {}) => {
    const student = await Student.findOne({ where: { userId } });
    if (!student) {
        throw new Error('Không tìm thấy sinh viên');
    }

    const task = await getTaskById(taskId);
    if (task.studentId !== student.id) {
        throw new Error('Bạn không có quyền nộp nhiệm vụ này');
    }

    const nextStatus = payload.status || 'REVIEW';
    if (!['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].includes(nextStatus)) {
        throw new Error('Trạng thái nhiệm vụ không hợp lệ');
    }

    const updatedTask = await task.update({
        status: nextStatus,
        submissionComment: payload.comment || task.submissionComment,
        submittedAt: new Date(),
        fileUrl: payload.fileUrl || task.fileUrl,
        fileName: payload.fileName || task.fileName,
        fileType: payload.fileType || task.fileType
    });

    const notifications = [];
    const adminUsers = await User.findAll({ where: { role: 'ADMIN' } });
    const studentName = student.fullName || `Sinh viên #${student.id}`;
    const submissionTitle = task.title || 'nhiệm vụ';
    const notificationMessage = `${studentName} đã nộp ${submissionTitle}`;

    adminUsers.forEach((admin) => {
        notifications.push({
            title: 'Task đã nộp',
            message: notificationMessage,
            userId: admin.id
        });
    });

    if (updatedTask.internshipId) {
        const internship = await Internship.findByPk(updatedTask.internshipId);
        if (internship?.mentorId) {
            const mentor = await Mentor.findByPk(internship.mentorId);
            if (mentor?.userId) {
                notifications.push({
                    title: 'Sinh viên nộp bài',
                    message: notificationMessage,
                    userId: mentor.userId
                });
            }
        }
    }

    if (notifications.length > 0) {
        try {
            await Notification.bulkCreate(notifications);
        } catch (nErr) {
            console.error('Notification bulkCreate error:', nErr);
            // don't fail the main operation because of notification DB issues
        }
    }

    return updatedTask;
};

module.exports = {
    getTaskById,
    getTasks,
    getMyTasks,
    createTask,
    updateTask,
    deleteTask,
    submitTask
};
