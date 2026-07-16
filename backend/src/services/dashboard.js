const sequelize = require('../config/database');
const Internship = require('../models/internship');
const Report = require('../models/report');
const User = require('../models/user');
const CheckIn = require('../models/checkIn');

const getAdminStats = async () => {
    const [totalInternships, pendingReports, totalEnterprises, totalCheckIns] = await Promise.all([
        Internship.count(),
        Report.count({ where: { status: 'SUBMITTED' } }),
        User.count({ where: { role: 'ENTERPRISE' } }),
        CheckIn.count()
    ]);

    const [studentCountResult] = await sequelize.query(`
        SELECT COUNT(*) AS totalStudents
        FROM students s
        INNER JOIN users u ON u.id = s.userId
        WHERE u.role = 'STUDENT'
    `);
    const totalStudents = Number(studentCountResult?.[0]?.totalStudents || 0);

    return {
        totalStudents,
        totalInternships,
        pendingReports,
        totalEnterprises,
        totalCheckIns
    };
};

module.exports = { getAdminStats };
