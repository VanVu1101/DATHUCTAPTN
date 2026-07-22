const Task = require('../models/task');
const Report = require('../models/report');
const Student = require('../models/student');
const Internship = require('../models/internship');
const WeeklyReport = require('../models/weeklyReport');

const getStudentProgress = async (userId, periodId = null) => {
    const student = await Student.findOne({ where: { userId } });
    if (!student) return null;

    const periodToUse = periodId || student.periodId || null;
    const internship = await Internship.findOne({
        where: { studentId: student.id, periodId: periodToUse },
        order: [['createdAt', 'DESC']]
    });

    const tasks = await Task.findAll({
        where: { studentId: student.id },
        order: [['deadline', 'ASC'], ['createdAt', 'DESC']]
    });

    const reports = await Report.findAll({
        where: { studentId: student.id },
        order: [['createdAt', 'DESC']]
    });

    const weeklyReports = periodToUse ? await WeeklyReport.findAll({
        where: { periodId: periodToUse },
        order: [['weekNumber', 'ASC']]
    }) : [];

    const taskSummary = {
        total: tasks.length,
        done: tasks.filter((task) => task.status === 'DONE').length,
        inProgress: tasks.filter((task) => task.status === 'IN_PROGRESS').length,
        review: tasks.filter((task) => task.status === 'REVIEW').length,
        todo: tasks.filter((task) => task.status === 'TODO').length,
        nextDeadline: tasks
            .filter((task) => task.deadline && task.status !== 'DONE')
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0] || null
    };

    const reportStatusCounts = {
        submitted: reports.filter((report) => report.status === 'SUBMITTED').length,
        reviewed: reports.filter((report) => report.status === 'REVIEWED').length,
        rejected: reports.filter((report) => report.status === 'REJECTED').length,
        draft: reports.filter((report) => report.status === 'DRAFT').length
    };

    const reportSummary = {
        total: reports.length,
        ...reportStatusCounts,
        latest: reports[0] || null,
        weeklyCount: weeklyReports.length,
        weeklySubmitted: weeklyReports.filter((report) => report.submissionStatus && report.submissionStatus !== 'UNSUBMITTED').length
    };

    const upcomingTasks = tasks
        .filter((task) => task.status !== 'DONE')
        .sort((a, b) => {
            if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
            if (a.deadline) return -1;
            if (b.deadline) return 1;
            return new Date(a.createdAt) - new Date(b.createdAt);
        })
        .slice(0, 4)
        .map((task) => ({
            id: task.id,
            title: task.title,
            deadline: task.deadline,
            status: task.status,
            priority: task.priority,
            fileUrl: task.fileUrl || null,
            fileName: task.fileName || null,
            description: task.description || ''
        }));

    const submittedWeekNumbers = new Set(
        reports
            .filter((report) => Number(report.weekNumber) > 0)
            .map((report) => Number(report.weekNumber))
    );

    let foundCurrent = false;
    const weeklyRoadmap = weeklyReports.map((weeklyReport) => {
        const weekNumber = weeklyReport.weekNumber;
        const completed = submittedWeekNumbers.has(weekNumber);
        const roadmapStatus = completed
            ? 'COMPLETED'
            : !foundCurrent
                ? 'CURRENT'
                : 'UPCOMING';
        if (!completed && !foundCurrent) foundCurrent = true;

        return {
            id: weeklyReport.id,
            weekNumber,
            title: weeklyReport.title,
            note: weeklyReport.description || '',
            dueDate: weeklyReport.dueDate || null,
            roadmapStatus,
            attachmentUrl: weeklyReport.attachmentUrl || null,
            attachmentName: weeklyReport.attachmentName || null,
            submissionStatus: completed ? 'SUBMITTED' : 'UNSUBMITTED'
        };
    });

    const progressPercent = taskSummary.total || reportSummary.weeklyCount
        ? Math.round(
            ((taskSummary.done + reportSummary.weeklySubmitted) /
                Math.max(1, taskSummary.total + reportSummary.weeklyCount)) * 100
          )
        : 0;

    return {
        internshipId: internship?.id || null,
        periodId: periodToUse,
        taskSummary,
        reportSummary,
        taskStatusCounts: {
            TODO: taskSummary.todo,
            IN_PROGRESS: taskSummary.inProgress,
            REVIEW: taskSummary.review,
            DONE: taskSummary.done
        },
        reportStatusCounts: {
            SUBMITTED: reportStatusCounts.submitted,
            REVIEWED: reportStatusCounts.reviewed,
            REJECTED: reportStatusCounts.rejected,
            DRAFT: reportStatusCounts.draft
        },
        upcomingTasks,
        weeklyRoadmap,
        progressPercent,
        nextDeadline: taskSummary.nextDeadline ? taskSummary.nextDeadline.deadline || taskSummary.nextDeadline : null,
        latestReport: reportSummary.latest ? {
            id: reportSummary.latest.id,
            title: reportSummary.latest.title || `Báo cáo tuần ${reportSummary.latest.weekNumber || ''}`,
            status: reportSummary.latest.status,
            submittedAt: reportSummary.latest.createdAt
        } : null,
        totalWeeks: weeklyReports.length,
        weeksCompleted: reportSummary.weeklySubmitted
    };
};

module.exports = { getStudentProgress };
