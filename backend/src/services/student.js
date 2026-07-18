const { Op } = require('sequelize');
const Student = require('../models/student');
const User = require('../models/user');
const Major = require('../models/major');
const InternshipPeriod = require('../models/internshipPeriod');
const Mentor = require('../models/mentor');
const Internship = require('../models/internship');
const Position = require('../models/position');
const ChatConversation = require('../models/chatConversation');
const sequelize = require('../config/database');
const StudentDocument = require('../models/studentDocument');
const { uploadFile, deleteFile } = require('../config/s3');
const reportService = require('./report');
const { filterStudentRecords, shouldCreateStudentProfile } = require('./studentHelpers');

const ensureDefaultMajor = async () => {
    let major = await Major.findOne();
    if (!major) {
        major = await Major.create({ name: 'Chưa phân công', description: 'Chuyên ngành mặc định' });
    }
    return major;
};

const buildStudentCode = (userId) => `SV${String(userId).padStart(5, '0')}`;

const formatInternshipDuration = (period) => {
    if (!period?.startDate || !period?.endDate) return '';
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';

    const formatDate = (date) => date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    return `${formatDate(start)} - ${formatDate(end)}`;
};

const buildProfilePayload = (student, user, options = {}) => ({
    id: student?.id || null,
    userId: user?.id || null,
    studentCode: student?.studentCode || '',
    fullName: student?.fullName || user?.email?.split('@')[0] || 'Sinh viên',
    className: student?.className || '',
    majorName: student?.majorName || student?.Major?.name || '',
    enterpriseName: student?.enterpriseName || '',
    mentorName: student?.mentorName || '',
    email: user?.email || '',
    role: user?.role || 'STUDENT',
    phoneNumber: student?.phoneNumber || '',
    address: student?.address || '',
    bio: student?.bio || '',
    linkedin: student?.linkedin || '',
    university: student?.university || '',
    groupName: student?.groupName || '',
    birthDate: student?.birthDate || '',
    headline: student?.headline || '',
    emergencyContact: student?.emergencyContact || '',
    emergencyPhone: student?.emergencyPhone || '',
    profileImageUrl: student?.profileImageUrl || user?.profileImageUrl || '',
    technicalSkills: student?.technicalSkills || [],
    softSkills: student?.softSkills || [],
    languages: student?.languages || [],
    periodId: student?.periodId || null,
    periodName: student?.InternshipPeriod?.name || '',
    internshipDuration: formatInternshipDuration(student?.InternshipPeriod),
    cvStatus: options.cvStatus || 'Chưa có',
    internshipDocumentStatus: options.internshipDocumentStatus || 'Chưa có',
    documentLink: options.documentLink || '',
    reportProgress: options.reportProgress ?? 0,
    lastReportStatus: options.lastReportStatus || null,
    lastReportTitle: options.lastReportTitle || '',
    lastReportSubmittedAt: options.lastReportSubmittedAt || null
});

const getMyProfile = async (userId) => {
    const user = await User.findByPk(userId, { attributes: ['id', 'email', 'role', 'profileImageUrl'] });
    if (!shouldCreateStudentProfile(user)) {
        return buildProfilePayload(null, user, {
            cvStatus: 'Chưa có',
            internshipDocumentStatus: 'Chưa có',
            documentLink: '',
            reportProgress: 0,
            lastReportStatus: null,
            lastReportTitle: '',
            lastReportSubmittedAt: null
        });
    }

    let student = await Student.findOne({ where: { userId } });
    if (student?.majorId) {
        const major = await Major.findByPk(student.majorId, { attributes: ['name'] });
        student = { ...student.toJSON(), Major: major };
    }
    if (student?.periodId) {
        const period = await InternshipPeriod.findByPk(student.periodId, { attributes: ['id', 'name', 'startDate', 'endDate'] });
        student = { ...student, InternshipPeriod: period };
    }

    if (!student) {
        const defaultMajor = await ensureDefaultMajor();
        try {
            student = await Student.create({
                studentCode: buildStudentCode(userId),
                fullName: user?.email?.split('@')[0] || 'Sinh viên',
                userId,
                majorId: defaultMajor.id,
                className: 'KTPM'
            });
        } catch (createErr) {
            console.error('❌ Student.create() failed:', createErr.message);
            console.error('Full error:', createErr);
            throw createErr;
        }
    }

    let cvStatus = 'Chưa có';
    let internshipDocumentStatus = 'Chưa có';
    let documentLink = '';
    let reportProgress = 0;
    let lastReportStatus = null;
    let lastReportTitle = '';
    let lastReportSubmittedAt = null;

    try {
        const docs = await StudentDocument.findAll({ where: { studentId: student.id } });
        const latestDoc = docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        const hasCv = docs.some((doc) => String(doc.category).toLowerCase().includes('cv'));
        const hasInternship = docs.some((doc) => {
            const category = String(doc.category || '').toLowerCase();
            return category.includes('internship') || category.includes('hồ sơ') || category.includes('hoso') || category.includes('hồ sơ thực tập');
        });

        cvStatus = hasCv ? 'Đã cập nhật' : 'Chưa có';
        internshipDocumentStatus = hasInternship ? 'Đã cập nhật' : 'Chưa có';
        documentLink = latestDoc?.fileUrl || '';
    } catch (err) {
        // ignore document status errors
    }

    try {
        const weeklyReports = await reportService.getWeeklyReportsForUser(userId, student.periodId);
        if (weeklyReports.length) {
            const completedCount = weeklyReports.filter((item) => item.submissionStatus !== 'UNSUBMITTED').length;
            reportProgress = Math.round((completedCount / weeklyReports.length) * 100);
            const latestSubmission = weeklyReports
                .filter((item) => item.submission)
                .sort((a, b) => new Date(b.submission.createdAt) - new Date(a.submission.createdAt))[0];
            if (latestSubmission) {
                lastReportStatus = latestSubmission.submission.status;
                lastReportTitle = latestSubmission.title || `Tuần ${latestSubmission.weekNumber}`;
                lastReportSubmittedAt = latestSubmission.submittedAt || latestSubmission.submission?.createdAt || null;
            }
        }
    } catch (err) {
        // ignore report progress errors
    }

    return buildProfilePayload(student, user, {
        cvStatus,
        internshipDocumentStatus,
        documentLink,
        reportProgress,
        lastReportStatus,
        lastReportTitle,
        lastReportSubmittedAt
    });
};

const updateMyProfile = async (userId, payload) => {
    try {
        const validatePhone = (value, label) => {
            if (value !== undefined && value !== '' && !/^\d{8,15}$/.test(String(value))) {
                throw new Error(`${label} chỉ được gồm 8–15 chữ số`);
            }
        };
        validatePhone(payload.phoneNumber, 'Số điện thoại');
        validatePhone(payload.emergencyPhone, 'Số điện thoại liên hệ gấp');

        let student = await Student.findOne({ where: { userId } });
        const user = await User.findByPk(userId, { attributes: ['id', 'email', 'role', 'profileImageUrl'] });

        if (!student) {
            const defaultMajor = await ensureDefaultMajor();
            student = await Student.create({
                studentCode: buildStudentCode(userId),
                fullName: payload.fullName || user?.email?.split('@')[0] || 'Sinh viên',
                userId,
                majorId: defaultMajor.id,
                majorName: payload.majorName || defaultMajor.name,
                className: payload.className || 'KTPM',
                enterpriseName: payload.enterpriseName || '',
                mentorName: payload.mentorName || '',
                linkedin: payload.linkedin || '',
                university: payload.university || '',
                groupName: payload.groupName || '',
                birthDate: payload.birthDate || '',
                headline: payload.headline || '',
                emergencyContact: payload.emergencyContact || '',
                emergencyPhone: payload.emergencyPhone || '',
                periodId: payload.periodId || null
            });
        }

        if (payload.majorName) {
            let major = await Major.findOne({ where: { name: payload.majorName } });
            if (!major) {
                major = await Major.create({ name: payload.majorName, description: 'Chuyên ngành cập nhật từ hồ sơ' });
            }
            payload.majorId = major.id;
        }

        console.log('Updating student with payload:', {
            fullName: payload.fullName,
            className: payload.className,
            majorName: payload.majorName,
            enterpriseName: payload.enterpriseName,
            mentorName: payload.mentorName,
            phoneNumber: payload.phoneNumber,
            address: payload.address,
            bio: payload.bio,
            linkedin: payload.linkedin,
            university: payload.university,
            groupName: payload.groupName,
            birthDate: payload.birthDate,
            headline: payload.headline,
            emergencyContact: payload.emergencyContact,
            emergencyPhone: payload.emergencyPhone,
            profileImageUrl: payload.profileImageUrl,
            technicalSkills: payload.technicalSkills,
            softSkills: payload.softSkills,
            languages: payload.languages,
            majorId: payload.majorId || student.majorId,
            periodId: payload.periodId,
            studentCode: payload.studentCode
        });

        const normalizeField = (value, fallback) => (value === undefined ? fallback : value);

        await student.update({
            fullName: normalizeField(payload.fullName, student.fullName),
            className: normalizeField(payload.className, student.className),
            majorName: normalizeField(payload.majorName, student.majorName),
            enterpriseName: normalizeField(payload.enterpriseName, student.enterpriseName),
            mentorName: normalizeField(payload.mentorName, student.mentorName),
            phoneNumber: normalizeField(payload.phoneNumber, student.phoneNumber),
            address: normalizeField(payload.address, student.address),
            bio: normalizeField(payload.bio, student.bio),
            linkedin: normalizeField(payload.linkedin, student.linkedin),
            university: normalizeField(payload.university, student.university),
            groupName: normalizeField(payload.groupName, student.groupName),
            birthDate: payload.birthDate === '' ? null : normalizeField(payload.birthDate, student.birthDate),
            headline: normalizeField(payload.headline, student.headline),
            emergencyContact: normalizeField(payload.emergencyContact, student.emergencyContact),
            emergencyPhone: normalizeField(payload.emergencyPhone, student.emergencyPhone),
            profileImageUrl: normalizeField(payload.profileImageUrl, student.profileImageUrl),
            technicalSkills: normalizeField(payload.technicalSkills, student.technicalSkills),
            softSkills: normalizeField(payload.softSkills, student.softSkills),
            languages: normalizeField(payload.languages, student.languages),
            majorId: payload.majorId || student.majorId,
            periodId: payload.periodId === undefined || payload.periodId === '' ? student.periodId : payload.periodId,
            studentCode: student.studentCode || buildStudentCode(userId)
        });

        return getMyProfile(userId);
    } catch (error) {
        console.error('updateMyProfile error details:', {
            message: error.message,
            errors: error.errors,
            validationErrors: error.validationErrors,
            original: error.original,
            sql: error.sql
        });
        throw error;
    }
};

const getProfileDocuments = async (userId) => {
    const student = await ensureStudentProfile(userId);
    return StudentDocument.findAll({ where: { studentId: student.id } });
};

const uploadProfileDocument = async (userId, payload, file) => {
    const student = await ensureStudentProfile(userId);

    const url = await uploadFile({
        fileBuffer: file.buffer,
        fileName: file.originalname,
        contentType: file.mimetype,
        folder: `student-documents/${student.id}`
    });

    return StudentDocument.create({
        studentId: student.id,
        title: payload.title || file.originalname,
        category: payload.category || 'HỒ SƠ',
        fileName: file.originalname,
        fileUrl: url,
        fileType: file.mimetype
    });
};

const deleteProfileDocument = async (userId, documentId) => {
    const student = await ensureStudentProfile(userId);

    const document = await StudentDocument.findOne({ where: { id: documentId, studentId: student.id } });
    if (!document) throw new Error('Tài liệu không tồn tại');

    const url = document.fileUrl || '';
    const useLocal = String(process.env.USE_LOCAL_UPLOAD || '').toLowerCase() === 'true';
    if (useLocal) {
        // url like http://localhost:5000/uploads/<key>
        const m = url.match(/\/uploads\/(.+)$/);
        if (m && m[1]) {
            await deleteFile(m[1]);
        }
    } else {
        const match = url.match(`https://${process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME}\\.s3\\.${process.env.AWS_REGION || 'ap-southeast-1'}\\.amazonaws\\.com/(.+)`);
        if (match && match[1]) {
            await deleteFile(match[1]);
        }
    }

    await document.destroy();
    return true;
};

const ensureStudentProfile = async (userId, fallbackName = '') => {
    let student = await Student.findOne({ where: { userId } });
    if (student) return student;

    const user = await User.findByPk(userId, { attributes: ['id', 'email', 'role'] });
    const defaultMajor = await ensureDefaultMajor();

    student = await Student.create({
        studentCode: buildStudentCode(userId),
        fullName: fallbackName || user?.email?.split('@')[0] || 'Sinh viên',
        userId,
        majorId: defaultMajor.id,
        className: 'KTPM'
    });

    return student;
};

const uploadProfileImage = async (userId, file) => {
    const student = await ensureStudentProfile(userId);

    const url = await uploadFile({
        fileBuffer: file.buffer,
        fileName: file.originalname,
        contentType: file.mimetype,
        folder: `student-profile/${student.id}`
    });

    const user = await User.findByPk(userId, { attributes: ['id', 'email', 'role', 'profileImageUrl'] });
    await student.update({ profileImageUrl: url });
    await user.update({ profileImageUrl: url });

    // Return the same profile payload as getMyProfile so frontend gets full period and internship info
    return getMyProfile(userId);
};

const getStudents = async (filters = {}) => {
    const where = {};

    if (filters.periodId) where.periodId = Number(filters.periodId);
    if (filters.mentorId) where.mentorId = Number(filters.mentorId);
    if (filters.status) where.status = filters.status;
    if (filters.search) {
        const searchText = `%${filters.search}%`;
        where[Op.or] = [
            { fullName: { [Op.like]: searchText } },
            { studentCode: { [Op.like]: searchText } },
            { className: { [Op.like]: searchText } },
            { majorName: { [Op.like]: searchText } },
            { enterpriseName: { [Op.like]: searchText } }
        ];
    }

    const students = await Student.findAll({
        where,
        include: [
            { model: User, attributes: ['email', 'role'] },
            { model: Major, attributes: ['name'] },
            { model: InternshipPeriod, attributes: ['id', 'name'] },
            { model: Mentor, attributes: ['id', 'fullName', 'companyName'] }
        ],
        order: [['fullName', 'ASC']]
    });
    return filterStudentRecords(students);
};

const getAllStudents = async () => {
    return getStudents();
};

const getStudentById = async (id) => {
    const student = await Student.findByPk(id, {
        include: [
            { model: User, attributes: ['email', 'role'] },
            { model: Major, attributes: ['name'] },
            { model: InternshipPeriod, attributes: ['id', 'name'] },
            { model: Mentor, attributes: ['id', 'fullName', 'companyName'] }
        ]
    });
    if (!student) throw new Error('Không tìm thấy sinh viên');
    return student;
};

const createStudent = async (data) => {
    return await Student.create(data);
};

const updateStudent = async (id, data) => {
    const student = await Student.findByPk(id);
    if (!student) throw new Error('Không tìm thấy sinh viên');
    return await student.update(data);
};

const assignMentor = async (studentId, mentorId, actor) => {
    return sequelize.transaction(async (transaction) => {
        const student = await Student.findByPk(studentId, { transaction });
        if (!student) throw new Error('Không tìm thấy sinh viên');
        if (!student.periodId) throw new Error('Sinh viên chưa được gán đợt thực tập');

        const mentor = await Mentor.findByPk(mentorId, { transaction });
        if (!mentor) throw new Error('Không tìm thấy mentor');
        if (actor.role === 'ENTERPRISE' && Number(mentor.ownerUserId) !== Number(actor.id)) {
            throw new Error('Bạn chỉ được phân công mentor thuộc doanh nghiệp của mình');
        }
        if (
            actor.role === 'ENTERPRISE'
            && String(student.enterpriseName || '').trim().toLowerCase()
                !== String(mentor.companyName || '').trim().toLowerCase()
        ) {
            throw new Error('Sinh viên chưa được gán cho doanh nghiệp của bạn');
        }

        const mentorUser = await User.findByPk(mentor.userId, { transaction });
        if (!mentorUser || mentorUser.role !== 'ENTERPRISE') {
            throw new Error('Mentor chưa có tài khoản ENTERPRISE hợp lệ');
        }

        let internship = await Internship.findOne({
            where: {
                studentId: student.id,
                periodId: student.periodId,
                status: { [Op.in]: ['PENDING', 'IN_PROGRESS'] }
            },
            order: [['updatedAt', 'DESC']],
            transaction
        });

        const oldMentorId = internship?.mentorId;
        if (!internship) {
            const [position] = await Position.findOrCreate({
                where: { name: 'Chưa phân công' },
                defaults: { description: 'Vị trí mặc định' },
                transaction
            });
            internship = await Internship.create({
                studentId: student.id,
                periodId: student.periodId,
                positionId: position.id,
                mentorId: mentor.id,
                status: 'IN_PROGRESS'
            }, { transaction });
        } else {
            await internship.update({ mentorId: mentor.id }, { transaction });
        }

        await student.update({
            mentorId: mentor.id,
            mentorName: mentor.fullName,
            enterpriseName: mentor.companyName
        }, { transaction });

        if (oldMentorId && Number(oldMentorId) !== Number(mentor.id)) {
            await ChatConversation.update(
                { status: 'ARCHIVED' },
                { where: { internshipId: internship.id, status: 'ACTIVE' }, transaction }
            );
        }

        return student;
    });
};

const deleteStudent = async (id) => {
    const student = await Student.findByPk(id);
    if (!student) throw new Error('Không tìm thấy sinh viên');
    await student.destroy();
    return true;
};

module.exports = {
    getStudents,
    getAllStudents,
    getMyProfile,
    updateMyProfile,
    getProfileDocuments,
    uploadProfileDocument,
    deleteProfileDocument,
    uploadProfileImage,
    getStudentById,
    createStudent,
    updateStudent,
    assignMentor,
    deleteStudent
};