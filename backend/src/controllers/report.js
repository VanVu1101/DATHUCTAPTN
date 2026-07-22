const reportService = require('../services/report');
const Mentor = require('../models/mentor');
const Student = require('../models/student');
const ReportModel = require('../models/report');
const WeeklyReport = require('../models/weeklyReport');
const User = require('../models/user');
const { scanBuffer } = require('../infrastructure/virusScan');
const { createAudit } = require('../services/auditService');
const notificationService = require('../services/notification');
const { uploadFile, getFileUrl } = require('../config/s3');
const { notifyTaskAssigned, notifyDeadlineSoon } = require('../services/automation');
const { sendReportSubmissionEmail } = require('../infrastructure/mail');
const { publishWeeklyReportSubmitted } = require('../services/sns.service');

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
        // If submission references a weekly template, enforce deadline
        if (payload.weeklyReportId) {
            const w = await WeeklyReport.findByPk(payload.weeklyReportId).catch(() => null);
            if (w && w.dueDate) {
                const now = new Date();
                const due = new Date(w.dueDate);
                if (now > due) {
                    return res.status(400).json({ success: false, message: 'Hạn nộp đã qua. Không thể nộp báo cáo.' });
                }
            }
        }

        if (req.file) {
            // optional virus scan
            try {
                const scanResult = await scanBuffer(req.file.buffer);
                if (scanResult && scanResult.ok === false && scanResult.infected) {
                    return res.status(400).json({ success: false, message: 'Tệp bị nghi ngờ chứa mã độc. Tải lên bị từ chối.' });
                }
            } catch (scanErr) {
                console.error('Virus scan error:', scanErr?.message || scanErr);
                // If scanning is enabled and fails, reject to be safe
                if (String(process.env.ENABLE_VIRUS_SCAN || '') === 'true') {
                    return res.status(500).json({ success: false, message: 'Lỗi quét tệp. Vui lòng thử lại sau.' });
                }
            }
            // Double-check file mime and size server-side (extra safety)
            const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            const maxBytes = 5 * 1024 * 1024;
            if (!allowed.includes(req.file.mimetype)) {
                return res.status(400).json({ success: false, message: 'Định dạng tệp không được hỗ trợ. Vui lòng tải lên PDF/DOC/DOCX.' });
            }
            if (req.file.size && req.file.size > maxBytes) {
                return res.status(400).json({ success: false, message: 'Kích thước tệp vượt quá giới hạn 5MB.' });
            }

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
            // record audit: upload
            try {
                await createAudit({ userId: req.user.id, action: 'upload', resourceType: 'report', resourceId: null, meta: { fileName: req.file.originalname } });
            } catch (e) {
                /* ignore */
            }
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

                            const mentorUser = await User.findByPk(mentor.userId);
                            if (mentorUser?.email) {
                                await sendReportSubmissionEmail(mentorUser.email, {
                                    recipientName: mentor.fullName || mentorUser.email,
                                    studentName: student.fullName || 'Sinh viên',
                                    weekNumber: report.weekNumber,
                                    reportLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reports`
                                });
                            }

                            await publishWeeklyReportSubmitted({
                                studentName: student.fullName || 'Sinh viên',
                                weekNumber: report.weekNumber,
                                submittedAt: report.createdAt || new Date().toISOString(),
                                status: 'Submitted'
                            });
                        }
                    }
                } catch (nErr) {
                    console.error('Notification error:', nErr.message || nErr);
                }
        // audit: report create/submission
        try { await createAudit({ userId: req.user.id, action: 'submit', resourceType: 'report', resourceId: report?.id || null }); } catch (e) {}
        res.status(201).json({ success: true, message: 'Báo cáo đã được nộp thành công. Mentor sẽ nhận thông báo.', data: report });
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
        try { await createAudit({ userId: req.user.id, action: 'update', resourceType: 'report', resourceId: report.id }); } catch (e) {}
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
        try { await createAudit({ userId: req.user.id, action: 'delete', resourceType: 'report', resourceId: Number(req.params.id) }); } catch (e) {}
        res.status(200).json({ success: true, message: 'Đã xóa báo cáo' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get reports created by the currently authenticated user
const getMyReports = async (req, res) => {
    try {
        const reports = await reportService.getReportsForUser(req.user.id);
        try { await createAudit({ userId: req.user.id, action: 'view_list', resourceType: 'report_list', resourceId: null }); } catch (e) {}
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
        try { await createAudit({ userId: req.user.id, action: 'view_list_admin', resourceType: 'report_list_admin', resourceId: null }); } catch (e) {}
        res.status(200).json({ success: true, data: reports });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const downloadReport = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const report = await ReportModel.findByPk(id);
        if (!report) return res.status(404).json({ success: false, message: 'Không tìm thấy báo cáo.' });

        // permission: owner or mentor of student or admin
        const isOwner = Number(report.userId) === Number(req.user.id) || Number(report.studentId) === Number(req.user.id);
        const okMentor = await mentorOwnsStudent(req.user.id, report.studentId).catch(() => false);
        const isAdmin = req.user?.role === 'ADMIN';
        if (!isOwner && !okMentor && !isAdmin) return res.status(403).json({ success: false, message: 'Không có quyền tải xuống báo cáo này.' });

        const fileUrl = report.fileUrl;
        if (!fileUrl) return res.status(404).json({ success: false, message: 'Báo cáo không có tệp đính kèm.' });

        // audit: download
        try { await createAudit({ userId: req.user.id, action: 'download', resourceType: 'report', resourceId: report.id }); } catch (e) {}

        // If URL already looks like a presigned URL or external link, redirect
        if (/X-Amz-Algorithm|X-Amz-Signature|X-Amz-Credential/.test(fileUrl) || /^https?:\/\//i.test(fileUrl) && !fileUrl.includes('.s3.')) {
            return res.redirect(fileUrl);
        }

        // If it is an S3 public URL, try to extract key and generate signed URL
        const s3Match = fileUrl.match(/https?:\/\/[^/]+\.s3(?:[.-][^/]+)?\.amazonaws\.com\/(.+)$/i);
        if (s3Match && s3Match[1]) {
            const key = decodeURIComponent(s3Match[1]);
            const signed = await getFileUrl(key);
            return res.redirect(signed);
        }

        // If local uploads path
        if (fileUrl.startsWith('/') || fileUrl.includes('/uploads/')) {
            const backendHost = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
            const url = fileUrl.startsWith('http') ? fileUrl : `${backendHost}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
            return res.redirect(url);
        }

        // Fallback: redirect to the stored URL
        return res.redirect(fileUrl);
    } catch (error) {
        console.error('downloadReport error:', error?.message || error);
        return res.status(500).json({ success: false, message: 'Lỗi khi xử lý yêu cầu tải xuống.' });
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
    deleteReport,
    downloadReport
};
