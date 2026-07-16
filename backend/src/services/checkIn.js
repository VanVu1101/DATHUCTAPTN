const CheckIn = require('../models/checkIn');
const Internship = require('../models/internship');
const Student = require('../models/student');
const Position = require('../models/position');
const Mentor = require('../models/mentor');
const Major = require('../models/major');
const User = require('../models/user');
const InternshipPeriod = require('../models/internshipPeriod');

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
        // Ensure student record exists (create if missing)
        let student = await Student.findOne({ where: { userId } });
        console.log('createCheckIn: found student?', !!student);
        if (!student) {
            // Require that a corresponding User account exists before creating Student
            const userRow = await User.findByPk(userId, { attributes: ['email'] });
            if (!userRow) {
                throw new Error('Người dùng không tồn tại. Vui lòng đăng nhập/đăng ký để sử dụng tính năng điểm danh.');
            }
            // create default major if missing
            let defaultMajor = await Major.findOne();
            if (!defaultMajor) {
                defaultMajor = await Major.create({ name: 'Chưa phân công', description: 'Chuyên ngành mặc định' });
            }
            const user = userRow || await User.findByPk(userId, { attributes: ['email'] });
            const fullName = user?.email?.split('@')[0] || 'Sinh viên';
            student = await Student.create({
                studentCode: `SV${String(userId).padStart(4, '0')}`,
                fullName,
                userId,
                majorId: defaultMajor.id,
                majorName: defaultMajor.name,
                className: 'KTPM'
            });
            // try to assign a periodId: use latest InternshipPeriod or create a default one
            let period = await InternshipPeriod.findOne({ order: [['startDate', 'DESC']] });
            if (!period) {
                const today = new Date();
                const end = new Date();
                end.setDate(end.getDate() + 90);
                period = await InternshipPeriod.create({
                    name: `Kỳ mặc định ${today.getFullYear()}`,
                    academicYear: `${today.getFullYear()}`,
                    startDate: today.toISOString().slice(0,10),
                    endDate: end.toISOString().slice(0,10),
                    description: 'Kỳ mặc định được tạo tự động'
                });
            }
            student.periodId = period.id;
            await student.save();
            console.log('createCheckIn: created student with periodId', student.periodId);
        } else if (!student.periodId) {
            // assign existing student a default period if missing
            let period = await InternshipPeriod.findOne({ order: [['startDate', 'DESC']] });
            if (!period) {
                const today = new Date();
                const end = new Date();
                end.setDate(end.getDate() + 90);
                period = await InternshipPeriod.create({
                    name: `Kỳ mặc định ${today.getFullYear()}`,
                    academicYear: `${today.getFullYear()}`,
                    startDate: today.toISOString().slice(0,10),
                    endDate: end.toISOString().slice(0,10),
                    description: 'Kỳ mặc định được tạo tự động'
                });
            }
            student.periodId = period.id;
            await student.save();
            console.log('createCheckIn: assigned periodId to existing student', student.periodId);
        }

        internship = await Internship.findOne({
            where: { studentId: student.id, status: 'IN_PROGRESS' },
            order: [['createdAt', 'DESC']],
        });
        if (!internship) {
            console.log('createCheckIn: no internship found, calling ensureStudentInternship with periodId', student.periodId);
            internship = await ensureStudentInternship(student, student.periodId || null);
            console.log('createCheckIn: ensureStudentInternship returned internship id', internship && internship.id);
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
        let student = await Student.findOne({ where: { userId } });
        if (!student) {
            // Require that a corresponding User account exists before creating Student
            const userRow = await User.findByPk(userId, { attributes: ['email'] });
            if (!userRow) {
                throw new Error('Người dùng không tồn tại. Vui lòng đăng nhập/đăng ký để sử dụng tính năng điểm danh.');
            }
            // create minimal student record if missing
            let defaultMajor = await Major.findOne();
            if (!defaultMajor) {
                defaultMajor = await Major.create({ name: 'Chưa phân công', description: 'Chuyên ngành mặc định' });
            }
            const user = userRow || await User.findByPk(userId, { attributes: ['email'] });
            const fullName = user?.email?.split('@')[0] || 'Sinh viên';
            student = await Student.create({
                studentCode: `SV${String(userId).padStart(4, '0')}`,
                fullName,
                userId,
                majorId: defaultMajor.id,
                majorName: defaultMajor.name,
                className: 'KTPM'
            });
            // assign default period for newly created student
            let period = await InternshipPeriod.findOne({ order: [['startDate', 'DESC']] });
            if (!period) {
                const today = new Date();
                const end = new Date();
                end.setDate(end.getDate() + 90);
                period = await InternshipPeriod.create({
                    name: `Kỳ mặc định ${today.getFullYear()}`,
                    academicYear: `${today.getFullYear()}`,
                    startDate: today.toISOString().slice(0,10),
                    endDate: end.toISOString().slice(0,10),
                    description: 'Kỳ mặc định được tạo tự động'
                });
            }
            student.periodId = period.id;
            await student.save();
        } else if (!student.periodId) {
            // assign period to existing student if missing
            let period = await InternshipPeriod.findOne({ order: [['startDate', 'DESC']] });
            if (!period) {
                const today = new Date();
                const end = new Date();
                end.setDate(end.getDate() + 90);
                period = await InternshipPeriod.create({
                    name: `Kỳ mặc định ${today.getFullYear()}`,
                    academicYear: `${today.getFullYear()}`,
                    startDate: today.toISOString().slice(0,10),
                    endDate: end.toISOString().slice(0,10),
                    description: 'Kỳ mặc định được tạo tự động'
                });
            }
            student.periodId = period.id;
            await student.save();
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