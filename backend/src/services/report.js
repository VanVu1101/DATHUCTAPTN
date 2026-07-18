const Report = require('../models/report');
const Internship = require('../models/internship');
const Student = require('../models/student');
const WeeklyReport = require('../models/weeklyReport');
const InternshipPeriod = require('../models/internshipPeriod');
const Position = require('../models/position');
const Mentor = require('../models/mentor');
const Evaluation = require('../models/evaluation');
// Evaluation model already required above

const getLatestInternshipForUser = async (userId) => {
    const student = await Student.findOne({ where: { userId } });
    if (!student) {
        throw new Error('Không tìm thấy sinh viên để tạo báo cáo');
    }

    const internship = await Internship.findOne({
        where: { studentId: student.id },
        order: [['createdAt', 'DESC']]
    });

    if (!internship) {
        throw new Error('Không tìm thấy kỳ thực tập để gửi báo cáo');
    }

    return internship;
};

const ensureStudentInternship = async (student, periodId = null) => {
    let internship = await Internship.findOne({
        where: {
            studentId: student.id,
            ...(periodId ? { periodId } : {})
        },
        order: [['createdAt', 'DESC']]
    });

    if (internship) return internship;

    let position = await Position.findOne({ where: { name: 'Chưa phân công' } });
    if (!position) {
        position = await Position.create({ name: 'Chưa phân công', description: 'Vị trí mặc định cho sinh viên chưa phân công' });
    }

    if (!student.mentorId) {
        throw new Error('Sinh viên chưa được phân công mentor.');
    }
    const mentor = await Mentor.findByPk(student.mentorId);
    if (!mentor || Number(mentor.userId) === Number(student.userId)) {
        throw new Error('Mentor được phân công không hợp lệ.');
    }

    return Internship.create({
        studentId: student.id,
        periodId: periodId || student.periodId || null,
        positionId: position.id,
        mentorId: mentor.id,
        status: 'IN_PROGRESS'
    });
};

const createWeeklyReport = async (data) => {
    if (!data.periodId) throw new Error('periodId is required');
    if (!data.weekNumber) throw new Error('weekNumber is required');
    if (!data.title) throw new Error('title is required');
    if (!data.description) throw new Error('description is required');
    if (data.dueDate) {
        const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh'
        }).format(new Date());
        if (String(data.dueDate).slice(0, 10) < today) {
            throw new Error('Hạn nộp không được nhỏ hơn ngày hiện tại');
        }
    }

    const period = await InternshipPeriod.findByPk(data.periodId);
    if (!period) throw new Error('Không tìm thấy đợt thực tập này!');

    const existing = await WeeklyReport.findOne({
        where: { periodId: data.periodId, weekNumber: data.weekNumber }
    });

    if (existing) {
        throw new Error(`Báo cáo tuần ${data.weekNumber} đã tồn tại trong đợt thực tập này`);
    }

    return WeeklyReport.create(data);
};

const updateWeeklyReport = async (id, data) => {
    const weeklyReport = await WeeklyReport.findByPk(id);
    if (!weeklyReport) throw new Error('Không tìm thấy tuần báo cáo');
    if (data.dueDate) {
        const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh'
        }).format(new Date());
        if (String(data.dueDate).slice(0, 10) < today) {
            throw new Error('Hạn nộp không được nhỏ hơn ngày hiện tại');
        }
    }
    return weeklyReport.update({
        periodId: data.periodId ?? weeklyReport.periodId,
        weekNumber: data.weekNumber ?? weeklyReport.weekNumber,
        title: data.title ?? weeklyReport.title,
        description: data.description ?? weeklyReport.description,
        dueDate: data.dueDate ?? weeklyReport.dueDate,
        attachmentUrl: data.attachmentUrl ?? weeklyReport.attachmentUrl,
        attachmentName: data.attachmentName ?? weeklyReport.attachmentName,
        status: data.status ?? weeklyReport.status
    });
};

const deleteWeeklyReport = async (id) => {
    const weeklyReport = await WeeklyReport.findByPk(id);
    if (!weeklyReport) throw new Error('Không tìm thấy tuần báo cáo');
    const submissions = await Report.count({ where: { weeklyReportId: id } });
    if (submissions > 0) {
        throw new Error('Không thể xóa tuần đã có sinh viên nộp báo cáo');
    }
    await weeklyReport.destroy();
    return true;
};

const getWeeklyReports = async (periodId = null) => {
    const where = {};
    if (periodId) where.periodId = periodId;

    return WeeklyReport.findAll({
        where,
        order: [['weekNumber', 'ASC']]
    });
};

const { Op } = require('sequelize');

const getWeeklyReportsForUser = async (userId, periodId = null) => {
    const student = await Student.findOne({ where: { userId } });
    if (!student) {
        throw new Error('Không tìm thấy sinh viên để gửi báo cáo');
    }

    let internship = null;
    let periodToUse = null;
    if (periodId) {
        periodToUse = Number(periodId);
        internship = await Internship.findOne({ where: { studentId: student.id, periodId: periodToUse } });
    } else {
        internship = await getLatestInternshipForUser(userId);
        periodToUse = internship?.periodId || null;
    }

    if (!periodToUse) {
        throw new Error('Không tìm thấy kỳ thực tập phù hợp');
    }

    const weeklyReports = await WeeklyReport.findAll({
        where: { periodId: periodToUse },
        order: [['weekNumber', 'ASC']]
    });

    const submissions = internship
        ? await Report.findAll({
            where: {
                internshipId: internship.id,
                [Op.or]: [ { userId }, { studentId: student.id } ]
            },
            order: [['createdAt', 'DESC']]
        })
        : [];
    // fetch evaluation for this internship (if any) and attach score to submission when missing
    const evaluation = internship ? await Evaluation.findOne({ where: { internshipId: internship.id } }) : null;

    return weeklyReports.map((weeklyReport) => {
        const submission = submissions.find((item) => item.weeklyReportId === weeklyReport.id || item.weekNumber === weeklyReport.weekNumber) || null;
        const submissionObj = submission ? (typeof submission.toJSON === 'function' ? submission.toJSON() : submission) : null;
        if (submissionObj && evaluation) {
            submissionObj.evaluation = evaluation.toJSON ? evaluation.toJSON() : evaluation;
            // if submission itself doesn't have a score, use evaluation score
            if (submissionObj.score == null && evaluation.score != null) submissionObj.score = evaluation.score;
        }
        return {
            ...weeklyReport.toJSON(),
            submission: submissionObj,
            submissionStatus: submissionObj ? submissionObj.status : 'UNSUBMITTED',
            reviewerNote: submissionObj?.reviewerNote || '',
            fileUrl: submissionObj?.fileUrl || '',
            fileName: submissionObj?.fileName || '',
            fileType: submissionObj?.fileType || '',
            submittedAt: submissionObj?.createdAt || null
        };
    });
};

const createReportForUser = async (data) => {
    if (!data.weekNumber && !data.weeklyReportId) throw new Error('weekNumber is required');

    const student = await Student.findOne({ where: { userId: data.userId } });
    if (!student) {
        throw new Error('Không tìm thấy sinh viên để gửi báo cáo');
    }

    let internship = null;
    let weeklyReport = null;

    if (data.weeklyReportId) {
        weeklyReport = await WeeklyReport.findByPk(data.weeklyReportId);
        if (!weeklyReport) throw new Error('Không tìm thấy báo cáo hàng tuần này!');

        internship = await ensureStudentInternship(student, weeklyReport.periodId);
    } else if (data.internshipId) {
        internship = await Internship.findByPk(data.internshipId);
    } else {
        internship = await ensureStudentInternship(student, student.periodId || null);
    }

    if (!internship) throw new Error('Không tìm thấy kỳ thực tập này!');

    const weekNumber = weeklyReport?.weekNumber || data.weekNumber;

    const existingReport = await Report.findOne({
        where: {
            internshipId: internship.id,
            ...(weeklyReport ? { weeklyReportId: weeklyReport.id } : { weekNumber })
        }
    });

    if (existingReport && existingReport.status !== 'REJECTED') {
        throw new Error(`Báo cáo tuần ${weekNumber} đã được nộp!`);
    }

    if (existingReport && existingReport.status === 'REJECTED') {
        existingReport.weekNumber = weekNumber;
        existingReport.content = data.content || existingReport.content;
        if (data.fileUrl) existingReport.fileUrl = data.fileUrl;
        if (data.fileName) existingReport.fileName = data.fileName;
        if (data.fileType) existingReport.fileType = data.fileType;
        existingReport.status = 'SUBMITTED';
        existingReport.reviewerNote = null;
        if (weeklyReport) existingReport.weeklyReportId = weeklyReport.id;
        return existingReport.save();
    }

    return await Report.create({
        ...data,
        internshipId: internship.id,
        studentId: student.id,
        weeklyReportId: weeklyReport?.id || data.weeklyReportId || null,
        weekNumber,
        userId: data.userId
    });
};

const getReportsForUser = async (userId) => {
    const student = await Student.findOne({ where: { userId } }).catch(() => null);
    const where = student ? { [Op.or]: [{ userId }, { studentId: student.id }] } : { userId };
    const rs = await Report.findAll({ where, order: [['createdAt', 'DESC']] });
    if (!rs || !rs.length) return rs;

    // collect internshipIds and fetch evaluations in bulk
    const internshipIds = Array.from(new Set(rs.map((r) => r.internshipId).filter(Boolean)));
    const evaluations = internshipIds.length ? await Evaluation.findAll({ where: { internshipId: internshipIds } }) : [];
    const evalMap = {};
    evaluations.forEach((ev) => { if (ev && ev.internshipId) evalMap[ev.internshipId] = ev; });

    return rs.map((r) => {
        const obj = typeof r.toJSON === 'function' ? r.toJSON() : r;
        const ev = obj.internshipId ? evalMap[obj.internshipId] : null;
        if (ev) {
            obj.evaluation = ev.toJSON ? ev.toJSON() : ev;
            if (obj.score == null && ev.score != null) obj.score = ev.score;
        }
        return obj;
    });
};

const getMySummary = async (userId) => {
    const student = await Student.findOne({ where: { userId } });
    if (!student) {
        return { averageScore: null, scoreCount: 0, reportCount: 0, latestInternshipId: null };
    }

    const internship = await Internship.findOne({
        where: { studentId: student.id },
        order: [['createdAt', 'DESC']]
    });

    const [reports, evaluation] = await Promise.all([
        Report.findAll({ where: { userId }, order: [['createdAt', 'DESC']] }),
        internship ? Evaluation.findOne({ where: { internshipId: internship.id } }) : null
    ]);

    return {
        averageScore: evaluation?.score != null ? Number(evaluation.score) : null,
        scoreCount: evaluation ? 1 : 0,
        reportCount: reports.length,
        latestInternshipId: internship?.id || null
    };
};

const getAllReports = async () => {
    return Report.findAll({ order: [['createdAt', 'DESC']] });
};

const getReports = async (filters = {}) => {
    const where = {};
    if (filters.studentId) where.studentId = Number(filters.studentId);
    if (filters.internshipId) where.internshipId = Number(filters.internshipId);
    if (filters.weeklyReportId) where.weeklyReportId = Number(filters.weeklyReportId);
    if (filters.status) where.status = filters.status;

    const include = [
        { model: Student, attributes: ['id', 'fullName', 'studentCode'] },
        { model: Internship, required: false, include: [{ model: InternshipPeriod, attributes: ['id', 'name'] }] },
        { model: WeeklyReport, required: false }
    ];

    return Report.findAll({ where, include, order: [['createdAt', 'DESC']] });
};

const createReport = async (data) => {
    let internship = null;
    let student = null;
    if (data.internshipId) {
        internship = await Internship.findByPk(data.internshipId);
        if (!internship) throw new Error('Không tìm thấy kỳ thực tập này!');
    } else if (data.studentId) {
        // ensure or create internship for the student (may use provided periodId)
        student = await Student.findByPk(data.studentId);
        if (!student) throw new Error('Không tìm thấy sinh viên này!');
        internship = await ensureStudentInternship(student, data.periodId || null);
        if (!internship) throw new Error('Không tìm thấy kỳ thực tập này!');
    } else {
        throw new Error('internshipId hoặc studentId là bắt buộc');
    }

    // if internship provided but student not known, try to load student from internship
    if (!student && internship?.studentId) {
        student = await Student.findByPk(internship.studentId).catch(() => null);
    }

    const existingReport = await Report.findOne({
        where: { internshipId: internship.id, weekNumber: data.weekNumber }
    });

    if (existingReport) throw new Error(`Báo cáo tuần ${data.weekNumber} đã được nộp!`);

    return await Report.create({
        ...data,
        internshipId: internship.id,
        studentId: data.studentId || null,
        content: data.content ?? data.description ?? null,
        userId: data.userId ?? (student ? student.userId : null)
    });
};

const getReportsByInternship = async (internshipId) => {
    return await Report.findAll({
        where: { internshipId },
        order: [['weekNumber', 'ASC']]
    });
};


const updateReportStatus = async (id, status, reviewerNote = null, evalPayload = null, mentorId = null) => {
    if (!['SUBMITTED', 'APPROVED', 'REJECTED'].includes(status)) {
        throw new Error('Trạng thái báo cáo không hợp lệ');
    }

    const report = await Report.findByPk(id);
    if (!report) throw new Error('Không tìm thấy báo cáo này!');

    report.status = status;
    if (reviewerNote !== undefined) {
        report.reviewerNote = reviewerNote;
    }
    const saved = await report.save();

    console.log(`updateReportStatus: reportId=${id} status=${status} mentorId=${mentorId} evalPayload=${JSON.stringify(evalPayload)}`);

    // If admin provides evaluation score when approving, create/update Evaluation
    try {
        if (status === 'APPROVED' && evalPayload && evalPayload.score != null) {
            const internshipId = report.internshipId;
            if (internshipId) {
                const internship = await Internship.findByPk(internshipId);
                const mentorRecord = mentorId ? await Mentor.findOne({ where: { userId: mentorId } }) : null;
                const mentorRefId = mentorRecord?.id || internship?.mentorId || null;
                const existingEval = await Evaluation.findOne({ where: { internshipId } });
                if (existingEval) {
                    console.log(`updateReportStatus: updating existing Evaluation id=${existingEval.id} for internship=${internshipId}`);
                    existingEval.score = evalPayload.score ?? existingEval.score;
                    existingEval.feedback = evalPayload.feedback ?? existingEval.feedback;
                    if (mentorRefId) existingEval.mentorId = mentorRefId;
                    await existingEval.save();
                } else {
                    console.log(`updateReportStatus: creating new Evaluation for internship=${internshipId} payload=${JSON.stringify(evalPayload)}`);
                    await Evaluation.create({
                        score: evalPayload.score,
                        feedback: evalPayload.feedback || '',
                        internshipId,
                        mentorId: mentorRefId,
                    });
                }
            }
        }
    } catch (e) {
        console.error('Error creating/updating Evaluation after report review:', e);
    }

    return saved;
};

const updateReport = async (id, data) => {
    const report = await Report.findByPk(id);
    if (!report) throw new Error('Không tìm thấy báo cáo này!');

    if (data.internshipId) {
        const internship = await Internship.findByPk(data.internshipId);
        if (!internship) throw new Error('Không tìm thấy kỳ thực tập này!');
    }

    return await report.update({
        content: data.content ?? report.content,
        fileUrl: data.fileUrl ?? report.fileUrl,
        fileName: data.fileName ?? report.fileName,
        fileType: data.fileType ?? report.fileType,
        weekNumber: data.weekNumber ?? report.weekNumber,
        weeklyReportId: data.weeklyReportId ?? report.weeklyReportId,
        status: data.status ?? report.status,
        reviewerNote: data.reviewerNote ?? report.reviewerNote,
        internshipId: data.internshipId ?? report.internshipId,
        userId: data.userId ?? report.userId,
        studentId: data.studentId ?? report.studentId
    });
};

const deleteReport = async (id) => {
    const report = await Report.findByPk(id);
    if (!report) throw new Error('Không tìm thấy báo cáo này!');
    await report.destroy();
    return true;
};

module.exports = {
    createWeeklyReport,
    updateWeeklyReport,
    deleteWeeklyReport,
    getWeeklyReports,
    getWeeklyReportsForUser,
    getReports,
    createReportForUser,
    getReportsForUser,
    getMySummary,
    getAllReports,
    createReport,
    getReportsByInternship,
    updateReportStatus,
    updateReport,
    deleteReport
};
