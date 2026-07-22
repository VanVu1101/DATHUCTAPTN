const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

const buildDashboardSummary = (stats = {}, recentReports = [], recentTasks = []) => {
  const safeStats = stats || {};
  const totalTasks = Number(safeStats.totalTasks || 0);
  const completedTasks = Number(safeStats.completedTasks || 0);
  const inProgressTasks = Number(safeStats.inProgressTasks || 0);
  const overdueTasks = Number(safeStats.overdueTasks || 0);
  const completedPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    overview: {
      totalStudents: Number(safeStats.totalStudents || 0),
      assignedStudents: Number(safeStats.assignedStudents || 0),
      unassignedStudents: Number(safeStats.unassignedStudents || 0),
      activeChats: Number(safeStats.activeChats || 0),
      totalInternships: Number(safeStats.totalInternships || 0),
      pendingReports: Number(safeStats.pendingReports || 0),
      totalEnterprises: Number(safeStats.totalEnterprises || 0),
      totalCheckIns: Number(safeStats.totalCheckIns || 0)
    },
    progress: {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      completedPercent
    },
    insights: [
      {
        title: 'Tiến độ công việc',
        value: `${completedPercent}% hoàn thành`,
        detail: `${completedTasks}/${totalTasks} task đã hoàn tất`
      },
      {
        title: 'Sinh viên đã phân công',
        value: `${safeStats.assignedStudents || 0} SV`,
        detail: 'Đã được gán mentor'
      },
      {
        title: 'Tin nhắn đang hoạt động',
        value: `${safeStats.activeChats || 0} cuộc`,
        detail: 'Hội thoại giữa mentor và học sinh'
      }
    ],
    recentReports: (recentReports || []).slice(0, 5).map((report) => ({
      id: report.id,
      weekNumber: report.weekNumber,
      status: report.status,
      submittedAt: formatDate(report.createdAt),
      studentName: report.Student?.fullName || 'Sinh viên'
    })),
    recentTasks: (recentTasks || []).slice(0, 5).map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      deadline: formatDate(task.deadline),
      studentName: task.Student?.fullName || 'Sinh viên'
    }))
  };
};

module.exports = { buildDashboardSummary };
