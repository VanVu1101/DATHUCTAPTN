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
const { uploadFile, deleteFile, getFileUrl } = require('../config/s3');
const { sendGenericEmail } = require('../infrastructure/mail');
const reportService = require('./report');
const notificationService = require('./notification');
const studentProgressService = require('./studentProgress');
const { filterStudentRecords, shouldCreateStudentProfile } = require('./studentHelpers');

const extractStorageKeyFromUrl = (url) => {
    if (!url) return null;
    const raw = String(url).trim();
    if (!raw.startsWith('http')) return raw;

    try {
        const parsed = new URL(raw);
        const path = parsed.pathname.replace(/^\/+/, '');
        if (path.startsWith('uploads/')) {
            return path.slice('uploads/'.length);
        }

        const host = parsed.hostname || '';
        const segments = path.split('/').filter(Boolean);

        // https://bucket.s3.region.amazonaws.com/key
        if (host.includes('.s3.') && segments.length > 0) {
            return segments.join('/');
        }

        // https://s3.region.amazonaws.com/bucket/key
        if (host.startsWith('s3') && segments.length > 1) {
            return segments.slice(1).join('/');
        }

        return path;
    } catch (error) {
        return null;
    }
};

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

const resolveProfileImageUrls = async (student, user) => {
    const normalize = async (item, label) => {
        if (!item?.profileImageUrl || String(item.profileImageUrl).startsWith('http')) return;
        try {
            item.profileImageUrl = await getFileUrl(item.profileImageUrl);
        } catch (error) {
            console.error(`resolveProfileImageUrls: failed to convert ${label}.profileImageUrl`, item.profileImageUrl, error?.message || error);
        }
    };

    await Promise.all([
        normalize(student, 'student'),
        normalize(user, 'user')
    ]);
};

const presignProfileImage = async (userId, expiresIn = signedUrlExpiresIn) => {
    const user = await User.findByPk(userId, { attributes: ['id', 'profileImageUrl'] });
    let student = await Student.findOne({ where: { userId } });
    if (!student && user) {
        // no student yet, try using user.profileImageUrl
        const key = extractStorageKeyFromUrl(user.profileImageUrl || '');
        if (!key) throw new Error('No profile image available to presign');
        return await getFileUrl(key, expiresIn);
    }
    if (!student) student = await ensureStudentProfile(userId);

    const raw = student.profileImageUrl || user?.profileImageUrl || '';
    const key = extractStorageKeyFromUrl(raw);
    if (!key) throw new Error('No profile image available to presign');
    return await getFileUrl(key, expiresIn);
};

const buildProfilePayload = (student, user, options = {}) => {
    const profileImageUrlCandidates = [student?.profileImageUrl, user?.profileImageUrl].filter(Boolean);
    const profileImageUrl = profileImageUrlCandidates.find((value) => String(value).startsWith('http')) || profileImageUrlCandidates[0] || '';

    return {
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
        profileImageUrl,
        avatar: profileImageUrl,
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
        lastReportSubmittedAt: options.lastReportSubmittedAt || null,
        progressData: options.progressData || null,
        progressPercent: options.progressData?.progressPercent ?? 0,
        taskSummary: options.progressData?.taskSummary || { total: 0, completed: 0, inProgress: 0, pending: 0 },
        reportSummary: options.progressData?.reportSummary || { total: 0, submitted: 0, draft: 0, weeklyCount: 0, weeklySubmitted: 0 },
        nextDeadline: options.progressData?.nextDeadline || null,
        latestReport: options.progressData?.latestReport || null,
        totalWeeks: options.progressData?.totalWeeks ?? 0,
        weeksCompleted: options.progressData?.weeksCompleted ?? 0,
        mentorDetails: options.mentorDetails || null
    };
};

const getMyProfile = async (userId) => {
    const user = await User.findByPk(userId, { attributes: ['id', 'email', 'role', 'profileImageUrl'] });
    if (!shouldCreateStudentProfile(user)) {
        await resolveProfileImageUrls(null, user);
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

    let mentorDetails = null;
    if (student?.mentorId) {
        const mentor = await Mentor.findByPk(student.mentorId, {
            attributes: ['id', 'fullName', 'companyName', 'phone', 'userId']
        });
        if (mentor) {
            const mentorUser = mentor.userId ? await User.findByPk(mentor.userId, { attributes: ['email'] }) : null;
            mentorDetails = {
                mentorName: mentor.fullName || student.mentorName || '',
                mentorCompany: mentor.companyName || student.enterpriseName || '',
                mentorPhone: mentor.phone || '',
                mentorEmail: mentorUser?.email || ''
            };
        }
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

    await resolveProfileImageUrls(student, user);

    let cvStatus = 'Chưa có';
    let internshipDocumentStatus = 'Chưa có';
    let documentLink = '';
    let reportProgress = 0;
    let lastReportStatus = null;
    let lastReportTitle = '';
    let lastReportSubmittedAt = null;
    let progressData = null;

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
        if (documentLink && !String(documentLink).startsWith('http')) {
            try {
                documentLink = await getFileUrl(documentLink);
            } catch (e) {
                // ignore conversion failures
            }
        }
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

    try {
        progressData = await studentProgressService.getStudentProgress(userId, student.periodId);
    } catch (err) {
        // ignore progress calculation errors
    }

    // Convert stored profileImageUrl keys to usable URLs when needed
    try {
        const { getFileUrl } = require('../config/s3');
        if (student && student.profileImageUrl && !String(student.profileImageUrl).startsWith('http')) {
            console.log('getMyProfile: converting student.profileImageUrl key:', student.profileImageUrl);
            try {
                student.profileImageUrl = await getFileUrl(student.profileImageUrl);
            } catch (e) {
                console.error('getMyProfile: failed to convert student.profileImageUrl', student.profileImageUrl, e?.message || e);
            }
            console.log('getMyProfile: converted student.profileImageUrl to:', student.profileImageUrl);
        }
        if (user && user.profileImageUrl && !String(user.profileImageUrl).startsWith('http')) {
            console.log('getMyProfile: converting user.profileImageUrl key:', user.profileImageUrl);
            try {
                user.profileImageUrl = await getFileUrl(user.profileImageUrl);
            } catch (e) {
                console.error('getMyProfile: failed to convert user.profileImageUrl', user.profileImageUrl, e?.message || e);
            }
            console.log('getMyProfile: converted user.profileImageUrl to:', user.profileImageUrl);
        }
    } catch (e) {
        console.error('getMyProfile: getFileUrl helper failed', e?.message || e);
    }

    return buildProfilePayload(student, user, {
        cvStatus,
        internshipDocumentStatus,
        documentLink,
        reportProgress,
        lastReportStatus,
        lastReportTitle,
        lastReportSubmittedAt,
        progressData,
        mentorDetails
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
    const documents = await StudentDocument.findAll({ where: { studentId: student.id } });
    return Promise.all(documents.map(async (doc) => {
        const record = doc.toJSON();
        if (record.fileUrl && !String(record.fileUrl).startsWith('http')) {
            try {
                record.fileUrl = await getFileUrl(record.fileUrl);
            } catch (error) {
                // ignore conversion failures
            }
        }
        return record;
    }));
};

const uploadProfileDocument = async (userId, payload, file) => {
    const student = await ensureStudentProfile(userId);

    const { url, key } = await uploadFile({
        fileBuffer: file.buffer,
        fileName: file.originalname,
        contentType: file.mimetype,
        folder: `student-documents/${student.id}`,
        returnMetadata: true
    });

    const document = await StudentDocument.create({
        studentId: student.id,
        title: payload.title || file.originalname,
        category: payload.category || 'HỒ SƠ',
        fileName: file.originalname,
        fileUrl: key || url,
        fileType: file.mimetype
    });

    const user = await User.findByPk(userId, { attributes: ['id', 'email'] });
    if (user?.email) {
        const fileName = file.originalname || 'tài liệu';
        const subject = 'InternHub: upload CV/ tài liệu thành công';
        const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h3>Upload thành công</h3>
                <p>Xin chào,</p>
                <p>File <strong>${fileName}</strong> đã được tải lên thành công trên hệ thống lưu trữ S3.</p>
                <p>Hệ thống đã lưu trữ file của bạn và bạn có thể xem lại trong hồ sơ cá nhân.</p>
            </div>
        `;
        const text = `File ${fileName} đã được tải lên thành công trên hệ thống lưu trữ S3.`;
        await sendGenericEmail({
            toEmail: user.email,
            subject,
            html,
            text
        });
    }

    const record = document.toJSON();
    if (record.fileUrl && !String(record.fileUrl).startsWith('http')) {
        try {
            record.fileUrl = await getFileUrl(record.fileUrl);
        } catch (error) {
            // ignore conversion failures
        }
    }
    return record;
};

const deleteProfileDocument = async (userId, documentId) => {
    const student = await ensureStudentProfile(userId);

    const document = await StudentDocument.findOne({ where: { id: documentId, studentId: student.id } });
    if (!document) throw new Error('Tài liệu không tồn tại');

    const key = extractStorageKeyFromUrl(document.fileUrl || '');
    if (!key) {
        throw new Error('Không xác định được file để xóa');
    }
    await deleteFile(key);

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

    const { url, key } = await uploadFile({
        fileBuffer: file.buffer,
        fileName: file.originalname,
        contentType: file.mimetype,
        folder: `student-profile/${student.id}`,
        returnMetadata: true
    });

    console.log('student.uploadProfileImage: uploadFile returned', { key, url });

    const user = await User.findByPk(userId, { attributes: ['id', 'email', 'role', 'profileImageUrl'] });
    await student.update({ profileImageUrl: key });
    await user.update({ profileImageUrl: key });

    // Return the same profile payload as getMyProfile so frontend gets full period and internship info
    return getMyProfile(userId);
};

const saveProfileImageKey = async (userId, key) => {
    const student = await ensureStudentProfile(userId);
    const user = await User.findByPk(userId, { attributes: ['id', 'email', 'role', 'profileImageUrl'] });

    // store the key (not a signed URL) so getMyProfile can generate signed URL for response
    await student.update({ profileImageUrl: key });
    await user.update({ profileImageUrl: key });

    return getMyProfile(userId);
};

const deleteProfileImage = async (userId) => {
    const student = await ensureStudentProfile(userId);
    const user = await User.findByPk(userId, { attributes: ['id', 'email', 'profileImageUrl'] });

    const key = extractStorageKeyFromUrl(student.profileImageUrl || user?.profileImageUrl || '');
    if (key) {
        try {
            await deleteFile(key);
        } catch (err) {
            console.warn('deleteProfileImage: deleteFile failed', err?.message || err);
        }
    }

    await student.update({ profileImageUrl: null });
    if (user) await user.update({ profileImageUrl: null });

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

    try {
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
    } catch (error) {
        if (error?.name === 'SequelizeEagerLoadingError') {
            const students = await Student.findAll({
                where,
                order: [['fullName', 'ASC']]
            });
            return filterStudentRecords(students);
        }
        throw error;
    }
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

const createStudent = async (data = {}) => {
    const defaultMajor = await ensureDefaultMajor();
    const parsedPeriodId = data.periodId === undefined || data.periodId === null || data.periodId === ''
        ? null
        : Number(data.periodId);

    const normalizedData = {
        ...data,
        studentCode: data.studentCode || buildStudentCode(Date.now()),
        fullName: data.fullName || 'Sinh viên mới',
        className: data.className || 'KTPM',
        majorName: data.majorName || defaultMajor.name,
        enterpriseName: data.enterpriseName || null,
        periodId: Number.isNaN(parsedPeriodId) ? null : parsedPeriodId,
        status: data.status || 'ACTIVE',
        userId: data.userId ? Number(data.userId) : null,
        majorId: data.majorId ? Number(data.majorId) : defaultMajor.id
    };

    if (!normalizedData.userId) {
        const fallbackUser = await User.create({
            email: `${String(normalizedData.studentCode || 'student').toLowerCase()}@local.test`,
            password: 'TempPassword@123',
            role: 'STUDENT'
        });
        normalizedData.userId = fallbackUser.id;
    }

    if (!normalizedData.majorId) {
        normalizedData.majorId = defaultMajor.id;
    }

    try {
        return await Student.create(normalizedData);
    } catch (error) {
        console.error('createStudent error:', error?.message || error);
        throw error;
    }
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

        const [conversation] = await ChatConversation.findOrCreate({
            where: {
                internshipId: internship.id,
                studentUserId: Number(student.userId),
                mentorUserId: Number(mentor.userId)
            },
            defaults: {
                status: 'ACTIVE'
            },
            transaction
        });

        if (conversation.status !== 'ACTIVE') {
            conversation.status = 'ACTIVE';
            await conversation.save({ transaction });
        }

        if (oldMentorId && Number(oldMentorId) !== Number(mentor.id)) {
            await ChatConversation.update(
                { status: 'ARCHIVED' },
                { where: { internshipId: internship.id, status: 'ACTIVE', mentorUserId: { [Op.ne]: mentor.userId } }, transaction }
            );
        }

        try {
            await Promise.all([
                notificationService.createNotification({
                    userId: mentor.userId,
                    title: 'Bạn có sinh viên mới',
                    message: `Sinh viên ${student.fullName || student.studentCode} đã được phân công cho bạn.`,
                    type: 'MENTOR_ASSIGN',
                    data: { studentId: student.id, internshipId: internship.id, conversationId: conversation.id }
                }),
                notificationService.createNotification({
                    userId: student.userId,
                    title: 'Bạn đã được phân công mentor',
                    message: `Mentor ${mentor.fullName} đã được giao hỗ trợ bạn trong kỳ thực tập này.`,
                    type: 'STUDENT_ASSIGN',
                    data: { mentorId: mentor.id, internshipId: internship.id, conversationId: conversation.id }
                })
            ]);
        } catch (notifyError) {
            console.error('Mentor assignment notification error:', notifyError.message || notifyError);
        }

        return student;
    });
};

const deleteStudent = async (id) => {
    return sequelize.transaction(async (transaction) => {
        const student = await Student.findByPk(id, { transaction });
        if (!student) throw new Error('Không tìm thấy sinh viên');

        const studentId = Number(student.id);
        const studentUserId = Number(student.userId);

        await Promise.allSettled([
            Internship.update(
                { status: 'FAILED' },
                { where: { studentId }, transaction }
            ),
            ChatConversation.update(
                { status: 'ARCHIVED' },
                { where: { studentUserId }, transaction }
            ),
            StudentDocument.destroy({ where: { studentId }, transaction })
        ]);

        await student.update({
            status: 'INACTIVE',
            mentorId: null,
            mentorName: null,
            enterpriseName: null,
            periodId: null
        }, { transaction });

        return true;
    });
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
    presignProfileImage,
    getStudentById,
    createStudent,
    updateStudent,
    assignMentor,
    deleteStudent
};
// export deleteProfileImage so controllers can use it
module.exports.deleteProfileImage = deleteProfileImage;