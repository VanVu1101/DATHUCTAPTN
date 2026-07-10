const { Op } = require('sequelize');
const Student = require('../models/student');
const User = require('../models/user');
const Major = require('../models/major');
const InternshipPeriod = require('../models/internshipPeriod');
const Mentor = require('../models/mentor');
const StudentDocument = require('../models/studentDocument');
const { uploadFile, deleteFile } = require('../config/s3');
const reportService = require('./report');

const ensureDefaultMajor = async () => {
    let major = await Major.findOne();
    if (!major) {
        major = await Major.create({ name: 'Chưa phân công', description: 'Chuyên ngành mặc định' });
    }
    return major;
};

const buildProfilePayload = (student, user, options = {}) => ({
    id: student?.id || null,
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
    profileImageUrl: student?.profileImageUrl || '',
    technicalSkills: student?.technicalSkills || [],
    softSkills: student?.softSkills || [],
    languages: student?.languages || [],
    periodId: student?.periodId || null,
    periodName: student?.InternshipPeriod?.name || '',
    cvStatus: options.cvStatus || 'Chưa có',
    internshipDocumentStatus: options.internshipDocumentStatus || 'Chưa có',
    documentLink: options.documentLink || '',
    reportProgress: options.reportProgress ?? 0,
    lastReportStatus: options.lastReportStatus || null,
    lastReportTitle: options.lastReportTitle || '',
    lastReportSubmittedAt: options.lastReportSubmittedAt || null
});

const getMyProfile = async (userId) => {
    const user = await User.findByPk(userId, { attributes: ['id', 'email', 'role'] });
    let student = await Student.findOne({
        where: { userId },
        include: [
            { model: User, attributes: ['email', 'role'] },
            { model: Major, attributes: ['name'] },
            { model: InternshipPeriod, attributes: ['id', 'name'] }
        ]
    });

    if (!student) {
        const defaultMajor = await ensureDefaultMajor();
        student = await Student.create({
            studentCode: `SV${String(userId).padStart(4, '0')}`,
            fullName: user?.email?.split('@')[0] || 'Sinh viên',
            userId,
            majorId: defaultMajor.id,
            majorName: defaultMajor.name,
            className: 'KTPM',
            enterpriseName: '',
            mentorName: '',
            linkedin: '',
            university: '',
            groupName: '',
            birthDate: '',
            headline: '',
            emergencyContact: '',
            emergencyPhone: ''
        });
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
    let student = await Student.findOne({ where: { userId } });
    const user = await User.findByPk(userId, { attributes: ['id', 'email', 'role'] });

    if (!student) {
        const defaultMajor = await ensureDefaultMajor();
        student = await Student.create({
            studentCode: `SV${String(userId).padStart(4, '0')}`,
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

    const updatedStudent = await student.update({
        fullName: payload.fullName ?? student.fullName,
        className: payload.className ?? student.className,
        majorName: payload.majorName ?? student.majorName,
        enterpriseName: payload.enterpriseName ?? student.enterpriseName,
        mentorName: payload.mentorName ?? student.mentorName,
        phoneNumber: payload.phoneNumber ?? student.phoneNumber,
        address: payload.address ?? student.address,
        bio: payload.bio ?? student.bio,
        linkedin: payload.linkedin ?? student.linkedin,
        university: payload.university ?? student.university,
        groupName: payload.groupName ?? student.groupName,
        birthDate: payload.birthDate ?? student.birthDate,
        headline: payload.headline ?? student.headline,
        emergencyContact: payload.emergencyContact ?? student.emergencyContact,
        emergencyPhone: payload.emergencyPhone ?? student.emergencyPhone,
        profileImageUrl: payload.profileImageUrl ?? student.profileImageUrl,
        technicalSkills: payload.technicalSkills ?? student.technicalSkills,
        softSkills: payload.softSkills ?? student.softSkills,
        languages: payload.languages ?? student.languages,
        majorId: payload.majorId || student.majorId,
        periodId: payload.periodId ?? student.periodId,
        studentCode: payload.studentCode ?? student.studentCode
    });

    const studentWithRelations = await Student.findByPk(updatedStudent.id, {
        include: [{ model: InternshipPeriod, attributes: ['id', 'name'] }]
    });

    return buildProfilePayload(studentWithRelations || updatedStudent, user);
};

const getProfileDocuments = async (userId) => {
    const student = await Student.findOne({ where: { userId } });
    if (!student) throw new Error('Sinh viên không tồn tại');

    return StudentDocument.findAll({ where: { studentId: student.id } });
};

const uploadProfileDocument = async (userId, payload, file) => {
    const student = await Student.findOne({ where: { userId } });
    if (!student) throw new Error('Sinh viên không tồn tại');

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
    const student = await Student.findOne({ where: { userId } });
    if (!student) throw new Error('Sinh viên không tồn tại');

    const document = await StudentDocument.findOne({ where: { id: documentId, studentId: student.id } });
    if (!document) throw new Error('Tài liệu không tồn tại');

    const url = document.fileUrl || '';
    const match = url.match(`https://${process.env.AWS_S3_BUCKET || process.env.AWS_BUCKET_NAME}\.s3\.${process.env.AWS_REGION || 'ap-southeast-1'}\.amazonaws\.com/(.+)`);
    if (match && match[1]) {
        await deleteFile(match[1]);
    }

    await document.destroy();
    return true;
};

const uploadProfileImage = async (userId, file) => {
    const student = await Student.findOne({ where: { userId } });
    if (!student) throw new Error('Sinh viên không tồn tại');

    const url = await uploadFile({
        fileBuffer: file.buffer,
        fileName: file.originalname,
        contentType: file.mimetype,
        folder: `student-profile/${student.id}`
    });

    await student.update({ profileImageUrl: url });
    return buildProfilePayload(student, await User.findByPk(userId, { attributes: ['id', 'email', 'role'] }));
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
    return students;
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
    deleteStudent
};