const taskService = require('../services/task');
const notificationService = require('../services/notification');
const { canManageTask, canSubmitTask } = require('../services/taskAccess');
const Student = require('../models/student');

const getTasks = async (req, res) => {
    try {
        if (!canManageTask(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xem danh sách nhiệm vụ này' });
        }

        const tasks = await taskService.getTasks({
            internshipId: req.query.internshipId,
            studentId: req.query.studentId,
            periodId: req.query.periodId ? Number(req.query.periodId) : null,
            status: req.query.status || undefined
        });
        res.status(200).json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getMyTasks = async (req, res) => {
    try {
        const periodId = req.query.periodId ? Number(req.query.periodId) : null;
        const tasks = await taskService.getMyTasks(req.user.id, periodId, req.query.status || null);
        res.status(200).json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getTaskById = async (req, res) => {
    try {
        const task = await taskService.getTaskById(req.params.id);
        res.status(200).json({ success: true, data: task });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};

const createTask = async (req, res) => {
    try {
        if (!canManageTask(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền tạo nhiệm vụ' });
        }

        console.log('API /api/tasks POST body:', req.body, 'user:', req.user?.id);
        const task = await taskService.createTask(req.body, { id: req.user?.id, role: req.user?.role });
                // create notification for assigned student if present
                try {
                    if (task && task.studentId) {
                        const student = await Student.findByPk(task.studentId);
                        if (student && student.userId) {
                            await notificationService.createNotification({
                                userId: student.userId,
                                title: 'Bạn có nhiệm vụ mới',
                                message: `Nhiệm vụ "${task.title || task.name || 'Mới'}" đã được giao.`,
                                type: 'TASK',
                                data: { taskId: task.id }
                            });
                        }
                    }
                } catch (nErr) {
                    console.error('Notification error:', nErr.message || nErr);
                }
        res.status(201).json({ success: true, data: task });
    } catch (error) {
        console.error('Error in createTask:', error);
        if (error && error.parent) console.error('Error parent:', error.parent);
        const message = error?.message || error?.parent?.sqlMessage || 'Lỗi khi tạo nhiệm vụ';
        res.status(500).json({ success: false, message });
    }
};

const updateTask = async (req, res) => {
    try {
        if (!canManageTask(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền cập nhật nhiệm vụ' });
        }

        const task = await taskService.updateTask(req.params.id, req.body, { id: req.user?.id, role: req.user?.role });
        res.status(200).json({ success: true, data: task });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const deleteTask = async (req, res) => {
    try {
        if (!canManageTask(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa nhiệm vụ' });
        }

        await taskService.deleteTask(req.params.id);
        res.status(200).json({ success: true, message: 'Đã xóa nhiệm vụ' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const submitTask = async (req, res) => {
    try {
        if (!canSubmitTask(req.user?.role)) {
            return res.status(403).json({ success: false, message: 'Chỉ sinh viên mới có thể nộp nhiệm vụ' });
        }

        if (req.file) {
            req.body.fileUrl = `/uploads/tasks/${req.file.filename}`;
            req.body.fileName = req.file.originalname;
            req.body.fileType = req.file.mimetype;
        }
        const task = await taskService.submitTask(req.params.id, req.user.id, req.body);
        res.status(200).json({ success: true, data: task });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const addComment = async (req, res) => {
    try {
        const task = await taskService.addTaskComment(req.params.id, req.user.id, req.user.role, req.body?.content);
        res.status(200).json({ success: true, data: task });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const saveMentorNote = async (req, res) => {
    try {
        const task = await taskService.saveMentorNote(req.params.id, req.user.id, req.user.role, req.body?.note);
        res.status(200).json({ success: true, data: task });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

module.exports = { getTasks, getMyTasks, getTaskById, createTask, updateTask, deleteTask, submitTask, addComment, saveMentorNote };