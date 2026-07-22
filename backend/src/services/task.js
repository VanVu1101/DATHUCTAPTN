const sequelize = require('../config/database');
const Task = require('../models/task');
const Student = require('../models/student');
const Internship = require('../models/internship');
const InternshipPeriod = require('../models/internshipPeriod');
const User = require('../models/user');
const Mentor = require('../models/mentor');
const Notification = require('../models/notification');
const { notifyTaskAssigned, notifyDeadlineSoon, notifyDeadlineRemindersForStudent } = require('./automation');
const { publishTaskCreated } = require('./sns.service');

const VALID_TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

const normalizeTaskPayload = (data = {}) => ({
    title: data.title?.trim?.() || '',
    description: data.description || '',
    deadline: data.deadline || null,
    assignedAt: data.assignedAt || null,
    category: data.category || null,
    taskCode: data.taskCode || null,
    priority: VALID_PRIORITIES.includes(data.priority) ? data.priority : 'MEDIUM',
    status: VALID_TASK_STATUSES.includes(data.status) ? data.status : 'TODO',
    internshipId: data.internshipId || null,
    studentId: data.studentId || null
});

const ensureTaskTableColumns = async () => {
    const addColumnIfMissing = async (columnName, definition) => {
        try {
            const [rows] = await sequelize.query(`SHOW COLUMNS FROM tasks LIKE '${columnName}'`);
            if (rows && rows.length > 0) return;
            await sequelize.query(`ALTER TABLE tasks ADD COLUMN \`${columnName}\` ${definition}`);
        } catch (error) {
            const message = error?.message || '';
            if (!/duplicate column|already exists/i.test(message)) {
                console.error(`ensureTaskTableColumns (${columnName}) error:`, message);
            }
        }
    };

    await addColumnIfMissing('mentorNote', 'TEXT NULL');
    await addColumnIfMissing('comments', 'JSON NULL');
    await addColumnIfMissing('activityLog', 'JSON NULL');
};

const buildActivityEntry = (action, details = {}, actor = {}) => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    action,
    actorId: actor.id || null,
    actorRole: actor.role || null,
    details,
    createdAt: new Date().toISOString()
});

const appendTaskActivity = async (task, action, details = {}, actor = {}) => {
    const nextLog = Array.isArray(task.activityLog) ? [...task.activityLog] : [];
    nextLog.push(buildActivityEntry(action, details, actor));
    await task.update({ activityLog: nextLog });
    return nextLog;
};

const getTaskById = async (id) => {
    await ensureTaskTableColumns();
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
    await ensureTaskTableColumns();
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
    await ensureTaskTableColumns();
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

    await notifyDeadlineRemindersForStudent(student.id);

    return Task.findAll({
        where,
        include,
        order: [['deadline', 'ASC'], ['createdAt', 'DESC']]
    });
};

const createTask = async (data, actor = {}) => {
    await ensureTaskTableColumns();
    const payload = normalizeTaskPayload(data);

    if (!payload.title) throw new Error('Tiêu đề nhiệm vụ là bắt buộc');
    if (!payload.studentId) throw new Error('Sinh viên nhận nhiệm vụ là bắt buộc');

    const student = await Student.findByPk(payload.studentId);
    if (!student) {
        throw new Error('Không tìm thấy sinh viên này');
    }

    let internshipId = payload.internshipId;
    if (!internshipId) {
        const internship = await Internship.findOne({ where: { studentId: student.id }, order: [['createdAt', 'DESC']] });
        internshipId = internship?.id || null;
    }

    if (!internshipId) {
        if (!student.periodId) {
            throw new Error('Sinh viên chưa được gán đợt thực tập');
        }
        if (!student.mentorId) {
            throw new Error('Sinh viên chưa được phân công mentor');
        }
        const mentor = await Mentor.findByPk(student.mentorId);
        if (!mentor || Number(mentor.userId) === Number(student.userId)) {
            throw new Error('Mentor được phân công không hợp lệ');
        }
        const Position = require('../models/position');
        let position = await Position.findOne({ where: { name: 'Chưa phân công' } });
        if (!position) {
            position = await Position.create({ name: 'Chưa phân công', description: 'Vị trí mặc định cho sinh viên chưa phân công' });
        }

        const createdInternship = await Internship.create({
            studentId: student.id,
            periodId: payload.periodId || student.periodId,
            positionId: position.id,
            mentorId: mentor.id,
            status: 'IN_PROGRESS'
        });

        internshipId = createdInternship.id;
    }

    const createdTask = await Task.create({
        title: payload.title,
        description: payload.description,
        deadline: payload.deadline,
        assignedAt: payload.assignedAt,
        category: payload.category,
        taskCode: payload.taskCode,
        priority: payload.priority,
        status: payload.status,
        internshipId,
        studentId: student.id
    });

    await notifyTaskAssigned(createdTask);
    await notifyDeadlineSoon(createdTask);
    await appendTaskActivity(createdTask, 'TASK_CREATED', { title: payload.title, studentId: student.id }, actor);

    try {
        await publishTaskCreated({
            title: createdTask.title,
            studentName: student.fullName || 'Sinh viên',
            deadline: createdTask.deadline || null,
            description: createdTask.description || '',
            category: createdTask.category || 'General'
        });
    } catch (snsError) {
        console.error('SNS task creation notification error:', snsError?.message || snsError);
    }

    return createdTask;
};

const updateTask = async (id, data, actor = {}) => {
    await ensureTaskTableColumns();
    const task = await getTaskById(id);
    const payload = normalizeTaskPayload({ ...task.toJSON(), ...data });

    const updatedTask = await task.update({
        title: payload.title ?? task.title,
        description: payload.description ?? task.description,
        deadline: payload.deadline ?? task.deadline,
        assignedAt: payload.assignedAt ?? task.assignedAt,
        category: payload.category ?? task.category,
        taskCode: payload.taskCode ?? task.taskCode,
        priority: payload.priority ?? task.priority,
        status: payload.status ?? task.status,
        studentId: payload.studentId ?? task.studentId
    });

    await appendTaskActivity(updatedTask, 'TASK_UPDATED', { changedFields: Object.keys(data || {}) }, actor);
    await notifyDeadlineSoon(updatedTask);

    return updatedTask;
};

const deleteTask = async (id) => {
    const task = await getTaskById(id);
    await task.destroy();
    return true;
};

const addTaskComment = async (taskId, userId, role, content) => {
    await ensureTaskTableColumns();
    const task = await getTaskById(taskId);
    const normalized = String(content || '').trim();
    if (!normalized) throw new Error('Nội dung bình luận là bắt buộc');

    const comments = Array.isArray(task.comments) ? [...task.comments] : [];
    comments.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        authorId: userId,
        authorRole: role || 'STUDENT',
        content: normalized,
        createdAt: new Date().toISOString()
    });

    await task.update({ comments });
    await appendTaskActivity(task, 'COMMENT_ADDED', { content: normalized }, { id: userId, role });
    return task.reload();
};

const saveMentorNote = async (taskId, userId, role, note) => {
    await ensureTaskTableColumns();
    const task = await getTaskById(taskId);
    const normalized = String(note || '').trim();
    const updatedTask = await task.update({ mentorNote: normalized || null });
    await appendTaskActivity(updatedTask, 'MENTOR_NOTE_UPDATED', { note: normalized || '' }, { id: userId, role });
    return updatedTask;
};

const submitTask = async (taskId, userId, payload = {}) => {
    await ensureTaskTableColumns();
    const student = await Student.findOne({ where: { userId } });
    if (!student) {
        throw new Error('Không tìm thấy sinh viên');
    }

    const task = await getTaskById(taskId);
    if (task.studentId !== student.id) {
        throw new Error('Bạn không có quyền nộp nhiệm vụ này');
    }

    const nextStatus = VALID_TASK_STATUSES.includes(payload.status) ? payload.status : 'REVIEW';
    if (!VALID_TASK_STATUSES.includes(nextStatus)) {
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

    await appendTaskActivity(updatedTask, 'TASK_SUBMITTED', { comment: payload.comment || '' }, { id: userId, role: 'STUDENT' });

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
    submitTask,
    addTaskComment,
    saveMentorNote
};
