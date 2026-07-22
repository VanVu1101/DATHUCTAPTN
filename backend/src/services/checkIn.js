const sequelize = require('../config/database');
const CheckIn = require('../models/checkIn');
const Internship = require('../models/internship');
const Student = require('../models/student');
const Position = require('../models/position');
const Mentor = require('../models/mentor');
const InternshipPeriod = require('../models/internshipPeriod');
const { Op } = require('sequelize');

const TIME_ZONE = 'Asia/Ho_Chi_Minh';

const getVietnamNow = () => {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
            timeZone: TIME_ZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23',
            weekday: 'short'
        }).formatToParts(new Date())
            .filter((part) => part.type !== 'literal')
            .map((part) => [part.type, part.value])
    );
    return {
        date: `${parts.year}-${parts.month}-${parts.day}`,
        time: `${parts.hour}:${parts.minute}:${parts.second}`,
        minutes: Number(parts.hour) * 60 + Number(parts.minute),
        weekday: parts.weekday
    };
};

const ensureCheckInTableColumns = async () => {
    const addColumnIfMissing = async (columnName, definition) => {
        try {
            const [rows] = await sequelize.query(`SHOW COLUMNS FROM check_ins LIKE '${columnName}'`);
            if (rows && rows.length > 0) return;
            await sequelize.query(`ALTER TABLE check_ins ADD COLUMN \`${columnName}\` ${definition}`);
        } catch (error) {
            const message = error?.message || '';
            if (!/duplicate column|already exists/i.test(message)) {
                console.error(`ensureCheckInTableColumns (${columnName}) error:`, message);
            }
        }
    };

    await addColumnIfMissing('note', 'TEXT NULL');
    await addColumnIfMissing('photoUrl', 'VARCHAR(255) NULL');
    await addColumnIfMissing('geoLat', 'FLOAT NULL');
    await addColumnIfMissing('geoLng', 'FLOAT NULL');
    await addColumnIfMissing('checkOutTime', 'TIME NULL');
};

const getOrCreateFallbackPeriodId = async (student, preferredPeriodId = null) => {
    if (preferredPeriodId) return preferredPeriodId;
    if (student?.periodId) return student.periodId;

    const existingPeriod = await InternshipPeriod.findOne({
        order: [['startDate', 'DESC'], ['createdAt', 'DESC']]
    });
    if (existingPeriod) return existingPeriod.id;

    const today = new Date();
    const startDate = today.toISOString().slice(0, 10);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()).toISOString().slice(0, 10);

    const createdPeriod = await InternshipPeriod.create({
        name: 'Kỳ demo',
        academicYear: `${today.getFullYear()}-${today.getFullYear() + 1}`,
        startDate,
        endDate,
        description: 'Kỳ thực tập dùng cho demo'
    });
    return createdPeriod.id;
};

const getOrCreateFallbackMentor = async (student) => {
    let mentor = await Mentor.findOne({ where: { userId: student.userId } });
    if (mentor) return mentor;

    mentor = await Mentor.findByPk(student.mentorId);
    if (mentor) return mentor;

    return Mentor.create({
        fullName: student.fullName || 'Mentor Demo',
        companyName: 'Công ty Demo',
        userId: student.userId,
        ownerUserId: student.userId
    });
};

const ensureStudentInternship = async (student, periodId = null) => {
    const targetPeriodId = await getOrCreateFallbackPeriodId(student, periodId);

    let internship = await Internship.findOne({
        where: {
            studentId: student.id,
            periodId: targetPeriodId
        },
        order: [['createdAt', 'DESC']]
    });

    if (internship) return internship;

    let position = await Position.findOne({ where: { name: 'Chưa phân công' } });
    if (!position) {
        position = await Position.create({ name: 'Chưa phân công', description: 'Vị trí mặc định cho sinh viên chưa phân công' });
    }

    const mentor = await getOrCreateFallbackMentor(student);

    return Internship.create({
        studentId: student.id,
        periodId: targetPeriodId,
        positionId: position.id,
        mentorId: mentor.id,
        status: 'IN_PROGRESS'
    });
};

const resolveInternship = async (userId, internshipId = null) => {
    const student = await Student.findOne({ where: { userId } });
    if (!student) throw new Error('Không tìm thấy hồ sơ sinh viên.');

    let internship = internshipId ? await Internship.findByPk(internshipId) : null;
    if (internship && Number(internship.studentId) !== Number(student.id)) {
        throw new Error('Bạn không có quyền điểm danh cho kỳ thực tập này.');
    }
    if (!internship) {
        internship = await Internship.findOne({
            where: {
                studentId: student.id,
                status: { [Op.in]: ['PENDING', 'IN_PROGRESS'] }
            },
            order: [['updatedAt', 'DESC']]
        });
    }
    if (!internship) internship = await ensureStudentInternship(student, student.periodId);
    return internship;
};

const createCheckIn = async ({ userId, internshipId, note, photoUrl = null, geoLat = null, geoLng = null }) => {
    await ensureCheckInTableColumns();
    const now = getVietnamNow();
    const internship = await resolveInternship(userId, internshipId);
    const existing = await CheckIn.findOne({ where: { internshipId: internship.id, date: now.date } });
    if (existing) {
        throw new Error('Bạn đã check-in cho ngày hôm nay rồi');
    }
    return CheckIn.create({
        date: now.date,
        time: now.time,
        status: 'PRESENT',
        internshipId: internship.id,
        note,
        photoUrl,
        geoLat,
        geoLng
    });
};

const recordCheckOut = async ({ userId, internshipId }) => {
    await ensureCheckInTableColumns();
    const now = getVietnamNow();
    const internship = await resolveInternship(userId, internshipId);
    const checkIn = await CheckIn.findOne({
        where: { internshipId: internship.id, date: now.date }
    });
    if (!checkIn) {
        throw new Error('Bạn chưa check-in hôm nay.');
    }
    if (checkIn.checkOutTime) {
        throw new Error('Bạn đã check-out hôm nay.');
    }
    checkIn.checkOutTime = now.time;
    return await checkIn.save();
};

const getCheckInsByUser = async (userId) => {
    await ensureCheckInTableColumns();
    const student = await Student.findOne({ where: { userId } });
    if (!student) {
        return [];
    }

    const internships = await Internship.findAll({ where: { studentId: student.id }, attributes: ['id'] });
    let internshipIds = internships.map((internship) => internship.id).filter((id) => id != null);
    if (!Array.isArray(internshipIds) || internshipIds.length === 0) {
        return [];
    }
    const currentInternship = await Internship.findOne({
        where: {
            studentId: student.id,
            status: { [Op.in]: ['PENDING', 'IN_PROGRESS'] }
        },
        order: [['updatedAt', 'DESC']],
        attributes: ['id']
    });

    try {
        return await CheckIn.findAll({
            where: { internshipId: internshipIds },
            include: [{ model: Internship, include: [{ model: Student }] }],
            order: [['createdAt', 'DESC']],
        });
    } catch (listErr) {
        console.error('checkIn.getCheckInsByUser DB error (findAll):', listErr && listErr.message ? listErr.message : listErr, { userId, internshipIds, now });
        return [];
    }
};

const getAdminSummary = async (periodId = null) => {
    const studentWhere = periodId ? { periodId: Number(periodId) } : {};
    const students = await Student.findAll({
        where: studentWhere,
        order: [['fullName', 'ASC']]
    });

    return Promise.all(students.map(async (student) => {
        const internshipWhere = { studentId: student.id };
        if (periodId) internshipWhere.periodId = Number(periodId);
        const internships = await Internship.findAll({
            where: internshipWhere,
            attributes: ['id']
        });
        const internshipIds = internships.map((item) => item.id);
        const records = internshipIds.length
            ? await CheckIn.findAll({
                where: { internshipId: { [Op.in]: internshipIds } },
                attributes: ['status']
            })
            : [];
        return {
            studentId: student.id,
            studentCode: student.studentCode,
            fullName: student.fullName,
            className: student.className,
            majorName: student.majorName,
            onTime: records.filter((item) => item.status === 'PRESENT').length,
            late: records.filter((item) => item.status === 'LATE').length,
            absent: records.filter((item) => item.status === 'ABSENT').length,
            total: records.length
        };
    }));
};

const getAdminDetail = async ({ studentId, status, periodId }) => {
    const student = await Student.findByPk(studentId);
    if (!student) throw new Error('Không tìm thấy sinh viên');
    const internshipWhere = { studentId: student.id };
    if (periodId) internshipWhere.periodId = Number(periodId);
    const internships = await Internship.findAll({
        where: internshipWhere,
        attributes: ['id']
    });
    const internshipIds = internships.map((item) => item.id);
    if (!internshipIds.length) return { student, records: [] };
    const where = { internshipId: { [Op.in]: internshipIds } };
    if (status && ['PRESENT', 'LATE', 'ABSENT'].includes(status)) where.status = status;
    const records = await CheckIn.findAll({
        where,
        order: [['date', 'DESC'], ['time', 'DESC']]
    });
    return { student, records };
};

module.exports = {
    createCheckIn,
    recordCheckOut,
    getCheckInsByUser,
    getAdminSummary,
    getAdminDetail
};