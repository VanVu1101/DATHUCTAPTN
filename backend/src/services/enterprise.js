const { Op } = require('sequelize');
const Mentor = require('../models/mentor');
const Student = require('../models/student');
const Report = require('../models/report');
const sequelize = require('../config/database');

const getEnterpriseSummary = async (enterpriseUserId, options = {}) => {
    const inactivityDays = options.inactivityDays || 14;

    const mentors = await Mentor.findAll({ where: { [Op.or]: [{ ownerUserId: enterpriseUserId }, { userId: enterpriseUserId }] } });
    const mentorIds = (mentors || []).map((m) => m.id).filter(Boolean);

    // If no mentors found, return zeros
    if (!mentorIds.length) {
        return {
            totalStudents: 0,
            percentReportsSubmitted: 0,
            pendingReports: 0,
            inactiveStudents: 0,
            mentorCount: 0
        };
    }

    const studentRows = await Student.findAll({ where: { mentorId: mentorIds }, attributes: ['id'] });
    const studentIds = (studentRows || []).map((s) => s.id);

    const totalStudents = studentIds.length;
    const mentorCount = mentorIds.length;

    const [submittedCountResult] = await sequelize.query(`
        SELECT COUNT(*) AS submitted
        FROM reports r
        WHERE r.studentId IN (${studentIds.length ? studentIds.join(',') : 'NULL'})
          AND r.status = 'SUBMITTED'
    `);
    const submitted = Number(submittedCountResult?.[0]?.submitted || 0);

    const [totalReportsResult] = await sequelize.query(`
        SELECT COUNT(*) AS total
        FROM reports r
        WHERE r.studentId IN (${studentIds.length ? studentIds.join(',') : 'NULL'})
    `);
    const totalReports = Number(totalReportsResult?.[0]?.total || 0);

    const percentReportsSubmitted = totalReports > 0 ? Math.round((submitted / totalReports) * 100) : 0;

    const [pendingCountResult] = await sequelize.query(`
        SELECT COUNT(*) AS pending
        FROM reports r
        WHERE r.studentId IN (${studentIds.length ? studentIds.join(',') : 'NULL'})
          AND r.status = 'SUBMITTED'
    `);
    const pendingReports = Number(pendingCountResult?.[0]?.pending || 0);

    // inactive students: no reports in last `inactivityDays` days
    const cutoff = new Date(Date.now() - inactivityDays * 24 * 60 * 60 * 1000);
    const cutoffStr = cutoff.toISOString().slice(0, 19).replace('T', ' ');
    const [inactiveResult] = await sequelize.query(`
        SELECT COUNT(*) AS inactive
        FROM students s
        WHERE s.mentorId IN (${mentorIds.join(',')})
          AND s.id NOT IN (
            SELECT DISTINCT studentId FROM reports WHERE createdAt >= '${cutoffStr}'
          )
    `);
    const inactiveStudents = Number(inactiveResult?.[0]?.inactive || 0);

    return {
        totalStudents,
        mentorCount,
        percentReportsSubmitted,
        pendingReports,
        inactiveStudents
    };
};

module.exports = { getEnterpriseSummary };
