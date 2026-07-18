const CheckIn = require('../models/checkIn');
const Internship = require('../models/internship');
const Student = require('../models/student');
const Position = require('../models/position');
const Mentor = require('../models/mentor');
const { Op } = require('sequelize');

const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const CHECK_IN_START = 8 * 60 + 30;
const ON_TIME_END = 9 * 60;
const CHECK_IN_END = 9 * 60 + 30;
const CHECK_OUT_START = 16 * 60 + 30;
const CHECK_OUT_END = 17 * 60;

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

const ensureStudentInternship = async (student, periodId = null) => {
    const targetPeriodId = periodId || student.periodId;
    if (!targetPeriodId) {
        throw new Error('Sinh viên chưa được gán kỳ thực tập. Vui lòng liên hệ quản trị để cập nhật kỳ thực tập trước khi check-in.');
    }

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

    if (!student.mentorId) {
        throw new Error('Sinh viên chưa được phân công mentor. Vui lòng liên hệ quản trị.');
    }
    const mentor = await Mentor.findByPk(student.mentorId);
    if (!mentor || Number(mentor.userId) === Number(student.userId)) {
        throw new Error('Mentor được phân công không hợp lệ.');
    }

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
    if (!student.periodId) throw new Error('Sinh viên chưa được gán kỳ thực tập.');

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

const createCheckIn = async ({ userId, internshipId, note }) => {
    const now = getVietnamNow();
    if (now.minutes < CHECK_IN_START) {
        throw new Error('Check-in chỉ mở từ 08:30.');
    }
    if (now.minutes > CHECK_IN_END) {
        throw new Error('Đã quá 09:30. Hôm nay bạn được ghi nhận vắng mặt.');
    }

    const internship = await resolveInternship(userId, internshipId);
    const existing = await CheckIn.findOne({ where: { internshipId: internship.id, date: now.date } });
    if (existing) {
        throw new Error('Bạn đã check-in cho ngày hôm nay rồi');
    }
    return CheckIn.create({
        date: now.date,
        time: now.time,
        status: now.minutes <= ON_TIME_END ? 'PRESENT' : 'LATE',
        internshipId: internship.id,
        note
    });
};

const recordCheckOut = async ({ userId, internshipId }) => {
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
    if (now.minutes < CHECK_OUT_START) {
        throw new Error('Checkout chỉ mở từ 16:30.');
    }
    if (now.minutes > CHECK_OUT_END) {
        checkIn.status = 'ABSENT';
        await checkIn.save();
        throw new Error('Đã quá 17:00. Hôm nay bạn được ghi nhận vắng mặt.');
    }
    checkIn.checkOutTime = now.time;
    return await checkIn.save();
};

const getCheckInsByUser = async (userId) => {
    const student = await Student.findOne({ where: { userId } });
    if (!student) {
        return [];
    }

    const internships = await Internship.findAll({ where: { studentId: student.id }, attributes: ['id'] });
    const internshipIds = internships.map((internship) => internship.id);
    if (internshipIds.length === 0) {
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

    const now = getVietnamNow();
    const todayRecord = await CheckIn.findOne({
        where: { internshipId: { [Op.in]: internshipIds }, date: now.date }
    });
    const isWeekday = !['Sat', 'Sun'].includes(now.weekday);
    if (!todayRecord && isWeekday && now.minutes > CHECK_IN_END) {
        await CheckIn.create({
            internshipId: currentInternship?.id || internshipIds[0],
            date: now.date,
            time: '09:30:00',
            status: 'ABSENT',
            note: 'Không check-in trong khung giờ quy định'
        });
    } else if (
        todayRecord
        && !todayRecord.checkOutTime
        && now.minutes > CHECK_OUT_END
        && todayRecord.status !== 'ABSENT'
    ) {
        await todayRecord.update({
            status: 'ABSENT',
            note: 'Không checkout trong khung giờ quy định'
        });
    }

    return CheckIn.findAll({
        where: { internshipId: internshipIds },
        include: [{ model: Internship, include: [{ model: Student }] }],
        order: [['createdAt', 'DESC']],
    });
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