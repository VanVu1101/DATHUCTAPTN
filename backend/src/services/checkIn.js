const CheckIn = require('../models/checkIn');
const Internship = require('../models/internship');
const Student = require('../models/student');
const Position = require('../models/position');
const Mentor = require('../models/mentor');

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

    let mentor = null;
    if (student.userId) {
        mentor = await Mentor.findOne({ where: { userId: student.userId } });
    }
    if (!mentor) {
        mentor = await Mentor.create({
            fullName: 'Chưa phân công',
            companyName: 'Chưa phân công',
            userId: student.userId
        });
    }

    return Internship.create({
        studentId: student.id,
        periodId: targetPeriodId,
        positionId: position.id,
        mentorId: mentor.id,
        status: 'IN_PROGRESS'
    });
};

const createCheckIn = async ({ userId, date, time, status, internshipId }) => {
    if (!date || !time || !status) {
        throw new Error('Missing required check-in fields');
    }

    let internship;
    if (internshipId) {
        internship = await Internship.findByPk(internshipId);
    } else {
        const student = await Student.findOne({ where: { userId } });
        if (!student) {
            throw new Error('Không tìm thấy sinh viên của người dùng');
        }
        internship = await Internship.findOne({
            where: { studentId: student.id, status: 'IN_PROGRESS' },
            order: [['createdAt', 'DESC']],
        });
        if (!internship) {
            internship = await ensureStudentInternship(student, student.periodId || null);
        }
    }

    if (!internship) {
        throw new Error('Không tìm thấy kỳ thực tập để check-in');
    }

    if (internshipId) {
        const student = await Student.findOne({ where: { userId } });
        if (!student || internship.studentId !== student.id) {
            throw new Error('Unauthorized internship for this user');
        }
    }

    const existing = await CheckIn.findOne({ where: { internshipId: internship.id, date } });
    if (existing) {
        throw new Error('Bạn đã check-in cho ngày hôm nay rồi');
    }

    const checkIn = await CheckIn.create({ date, time, status, internshipId: internship.id });
    return checkIn;
};

const recordCheckOut = async ({ userId, date, checkOutTime, internshipId }) => {
    if (!date) {
        throw new Error('Missing required check-out date');
    }

    let internship;
    if (internshipId) {
        internship = await Internship.findByPk(internshipId);
    } else {
        const student = await Student.findOne({ where: { userId } });
        if (!student) {
          throw new Error('Không tìm thấy sinh viên của người dùng');
        }
        internship = await Internship.findOne({
            where: { studentId: student.id, status: 'IN_PROGRESS' },
            order: [['createdAt', 'DESC']],
        });
        if (!internship) {
            internship = await ensureStudentInternship(student, student.periodId || null);
        }
    }

    if (!internship) {
        throw new Error('Không tìm thấy kỳ thực tập để check-out');
    }

    const checkIn = await CheckIn.findOne({ where: { internshipId: internship.id, date } });
    if (!checkIn) {
        throw new Error('Bạn chưa check-in cho ngày này');
    }

    if (checkIn.checkOutTime) {
        throw new Error('Bạn đã check-out cho ngày này rồi');
    }

    const finalCheckOutTime = checkOutTime || new Date().toTimeString().split(' ')[0];
    checkIn.checkOutTime = finalCheckOutTime;
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

    return CheckIn.findAll({
        where: { internshipId: internshipIds },
        include: [{ model: Internship, include: [{ model: Student }] }],
        order: [['createdAt', 'DESC']],
    });
};

module.exports = { createCheckIn, recordCheckOut, getCheckInsByUser };