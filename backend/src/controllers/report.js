const reportService = require('../services/report');
const Mentor = require('../models/mentor');
const Student = require('../models/student');
const ReportModel = require('../models/report');
const notificationService = require('../services/notification');
const { uploadFile } = require('../config/s3');

const mentorOwnsStudent = async (userId, studentId) => {
    const mentor = await Mentor.findOne({ where: { userId } });
    if (!mentor) return false;
    const student = await Student.findByPk(studentId);
    if (!student) return false;
    return Number(student.mentorId) === Number(mentor.id);
};

// Submit a report for the currently authenticated user
const submitReport = async (req, res) => {
    try {
        const payload = { ...req.body };
        payload.userId = req.user.id;
        if (req.file) {
            const student = await Student.findOne({ where: { userId: req.user.id } });
            const folder = `reports/${student?.id || req.user.id}`;
            const url = await uploadFile({
                fileBuffer: req.file.buffer,
                fileName: req.file.originalname,
                contentType: req.file.mimetype,
                folder
            });
            payload.fileUrl = url;
            payload.fileName = req.file.originalname;
            payload.fileType = req.file.mimetype;
        }
        const report = await reportService.createReportForUser(payload);
                // notify mentor if assigned
                try {
                    const student = await Student.findOne({ where: { userId: req.user.id } });
                    if (student && student.mentorId) {
                        const mentor = await Mentor.findByPk(student.mentorId);
                        if (mentor && mentor.userId) {
                            await notificationService.createNotification({
                                userId: mentor.userId,
                                title: 'Sinh viên nộp báo cáo mới',
                                message: `Sinh viên đã nộp báo cáo cho tuần ${report.weekNumber || ''}`,
                                type: 'REPORT_SUBMIT',
                                data: { reportId: report.id }
                            });
                        }
                    }
                } catch (nErr) {
                    console.error('Notification error:', nErr.message || nErr);
                }
        res.status(201).json({ success: true, data: report });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const createWeeklyReport = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (req.file) {
            const url = await uploadFile({
                fileBuffer: req.file.buffer,
                fileName: req.file.originalname,
                contentType: req.file.mimetype,
                folder: `weekly-report-templates/${payload.periodId}`
            });
            payload.attachmentUrl = url;
            payload.attachmentName = req.file.originalname;
        }
        const weeklyReport = await reportService.createWeeklyReport(payload);

        const students = await Student.findAll({
            where: { periodId: weeklyReport.periodId },
            attributes: ['userId']
        });
        await Promise.all(students.filter((student) => student.userId).map((student) => (
            notificationService.createNotification({
                userId: student.userId,
                title: `Báo cáo tuần ${weeklyReport.weekNumber}`,
                message: weeklyReport.title,
                type: 'WEEKLY_REPORT_CREATED',
                data: { weeklyReportId: weeklyReport.id, path: '/reports' }
            }).catch((error) => {
                console.error('Weekly report notification error:', error.message);
            })
        )));
        res.status(201).json({
            success: true,
            message: 'Tạo tuần báo cáo thành công',
            data: weeklyReport
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const updateWeeklyReport = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (req.file) {
            payload.attachmentUrl = await uploadFile({
                fileBuffer: req.file.buffer,
                fileName: req.file.originalname,
                contentType: req.file.mimetype,
                folder: `weekly-report-templates/${payload.periodId || 'general'}`
            });
            payload.attachmentName = req.file.originalname;
        }
        const data = await reportService.updateWeeklyReport(req.params.id, payload);
        res.json({ success: true, message: 'Đã cập nhật tuần báo cáo', data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const deleteWeeklyReport = async (req, res) => {
    try {
        await reportService.deleteWeeklyReport(req.params.id);
        res.json({ success: true, message: 'Đã xóa tuần báo cáo' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const getWeeklyReports = async (req, res) => {
    try {
        const weeklyReports = await reportService.getWeeklyReports(req.query.periodId || null);
        res.status(200).json({ success: true, data: weeklyReports });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getMyWeeklyReports = async (req, res) => {
    try {
        const periodId = req.query.periodId ? Number(req.query.periodId) : null;
        const weeklyReports = await reportService.getWeeklyReportsForUser(req.user.id, periodId);
        res.status(200).json({ success: true, data: weeklyReports });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateReportStatus = async (req, res) => {
    try {
        const evalPayload = {
            score: req.body.score,
            feedback: req.body.feedback
        };
        const report = await reportService.updateReportStatus(
            req.params.id,
            req.body.status,
            req.body.reviewerNote,
            evalPayload,
            req.user?.id
        );
        res.status(200).json({ success: true, data: report });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const createReport = async (req, res) => {
    try {
        // If requester is a mentor, allow only if mentor is assigned to the student in payload
        if (req.user?.role === 'MENTOR') {
            const sid = req.body.studentId;
            if (!sid) return res.status(403).json({ success: false, message: 'Mentor phải chỉ định `studentId` khi tạo báo cáo.' });
            const ok = await mentorOwnsStudent(req.user.id, sid);
            if (!ok) return res.status(403).json({ success: false, message: 'Bạn không có quyền tạo báo cáo cho sinh viên này.' });
        }

                const report = await reportService.createReport(req.body);
                // notify student when admin/mentor creates a report attached to a student
                try {
                    const sid = req.body.studentId || report.studentId;
                    if (sid) {
                        const student = await Student.findByPk(sid);
                        if (student && student.userId) {
                            await notificationService.createNotification({
                                userId: student.userId,
                                title: 'Báo cáo mới được thêm',
                                message: `Một báo cáo đã được tạo cho bạn.`,
                                type: 'REPORT_CREATED',
                                data: { reportId: report.id }
                            });
                        }
                    }
                } catch (nErr) {
                    console.error('Notification error:', nErr.message || nErr);
                }
                res.status(201).json({ success: true, data: report });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const updateReport = async (req, res) => {
    try {
        // If requester is a mentor, ensure mentor is assigned to the student of this report
        if (req.user?.role === 'MENTOR') {
            const existing = await ReportModel.findByPk(req.params.id);
            if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo.' });
            const sid = req.body.studentId ?? existing.studentId;
            if (!sid) return res.status(403).json({ success: false, message: 'Không có `studentId` để xác thực quyền hạn.' });
            const ok = await mentorOwnsStudent(req.user.id, sid);
            if (!ok) return res.status(403).json({ success: false, message: 'Bạn không có quyền sửa báo cáo của sinh viên này.' });
        }

        const report = await reportService.updateReport(req.params.id, req.body);
        res.status(200).json({ success: true, data: report });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

const deleteReport = async (req, res) => {
    try {
        // if mentor, check ownership
        if (req.user?.role === 'MENTOR') {
            const existing = await ReportModel.findByPk(req.params.id);
            if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo.' });
            const ok = await mentorOwnsStudent(req.user.id, existing.studentId);
            if (!ok) return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa báo cáo của sinh viên này.' });
        }

        await reportService.deleteReport(req.params.id);
        res.status(200).json({ success: true, message: 'Đã xóa báo cáo' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get reports created by the currently authenticated user
const getMyReports = async (req, res) => {
    try {
        const reports = await reportService.getReportsForUser(req.user.id);
        res.status(200).json({ success: true, data: reports });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getMySummary = async (req, res) => {
    try {
        const summary = await reportService.getMySummary(req.user.id);
        res.status(200).json({ success: true, data: summary });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getAllReports = async (req, res) => {
    try {
        const filters = {
            studentId: req.query.studentId,
            internshipId: req.query.internshipId,
            weeklyReportId: req.query.weeklyReportId,
            status: req.query.status
        };
        const reports = await reportService.getReports(filters);
        res.status(200).json({ success: true, data: reports });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getByInternship = async (req, res) => {
    try {
        const reports = await reportService.getReportsByInternship(req.params.id);
        res.status(200).json({ success: true, data: reports });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    submitReport,
    createWeeklyReport,
    updateWeeklyReport,
    deleteWeeklyReport,
    getWeeklyReports,
    getMyWeeklyReports,
    getMyReports,
    getMySummary,
    getAllReports,
    getByInternship,
    updateReportStatus,
    createReport,
    updateReport,
    deleteReport
};
