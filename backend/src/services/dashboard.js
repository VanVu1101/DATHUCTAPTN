const sequelize = require('../config/database');
const { Op } = require('sequelize');
const Internship = require('../models/internship');
const Report = require('../models/report');
const User = require('../models/user');
const CheckIn = require('../models/checkIn');
const Task = require('../models/task');
const Student = require('../models/student');
const ChatConversation = require('../models/chatConversation');
const { buildDashboardSummary } = require('./dashboardHelpers');

const getAdminStats = async () => {
    const [totalInternships, pendingReports, totalEnterprises, totalCheckIns, totalTasks, completedTasks, inProgressTasks, overdueTasks] = await Promise.all([
        Internship.count(),
        Report.count({ where: { status: 'SUBMITTED' } }),
        User.count({ where: { role: 'ENTERPRISE' } }),
        CheckIn.count(),
        Task.count(),
        Task.count({ where: { status: 'DONE' } }),
        Task.count({ where: { status: 'IN_PROGRESS' } }),
        Task.count({ where: { status: { [require('sequelize').Op.ne]: 'DONE' } } })
    ]);

    const [studentCountResult] = await sequelize.query(`
        SELECT COUNT(*) AS totalStudents
        FROM students s
        INNER JOIN users u ON u.id = s.userId
        WHERE u.role = 'STUDENT'
    `);
    const totalStudents = Number(studentCountResult?.[0]?.totalStudents || 0);

    const assignedStudents = await Student.count({ where: { mentorId: { [Op.ne]: null } } });
    const unassignedStudents = await Student.count({ where: { mentorId: null } });
    const activeChats = await ChatConversation.count({ where: { status: 'ACTIVE' } });

    const recentReports = await Report.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [{ model: Student, attributes: ['id', 'fullName'] }]
    });

    const recentTasks = await Task.findAll({
        limit: 5,
        order: [['deadline', 'ASC']],
        include: [{ model: Student, attributes: ['id', 'fullName'] }]
    });

    const stats = {
        totalStudents,
        assignedStudents,
        unassignedStudents,
        activeChats,
        totalInternships,
        pendingReports,
        totalEnterprises,
        totalCheckIns,
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks
    };

    return buildDashboardSummary(stats, recentReports, recentTasks);
};

module.exports = { getAdminStats };
