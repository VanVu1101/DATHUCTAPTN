const Student = require('../models/student');
const Internship = require('../models/internship');
const Report = require('../models/report');
const User = require('../models/user');
const CheckIn = require('../models/checkIn');

const getAdminStats = async () => {
    const [totalStudents, totalInternships, pendingReports, totalEnterprises, totalCheckIns] = await Promise.all([
        Student.count(),
        Internship.count(),
        Report.count({ where: { status: 'SUBMITTED' } }),
        User.count({ where: { role: 'ENTERPRISE' } }),
        CheckIn.count()
    ]);

    return {
        totalStudents,
        totalInternships,
        pendingReports,
        totalEnterprises,
        totalCheckIns
    };
};

module.exports = { getAdminStats };
