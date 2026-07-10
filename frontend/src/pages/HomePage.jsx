import '../App.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import TaskList from '../components/TaskList';
import ActivityList from '../components/ActivityList';
import MentorCard from '../components/MentorCard';
import ReportScoreModal from '../components/ReportScoreModal';
import { getMyProfile } from '../services/studentService';
import { getMyReports, getMySummary, getMyWeeklyReports } from '../services/reportService';
import { getMyCheckIns } from '../services/checkInService';
import { getMeetings } from '../services/meetingService';
import { getSchedules } from '../services/scheduleService';
import { getMyTasks } from '../services/taskService';
import { getAllPeriods } from '../services/periodService';
import { getEvaluationByInternship } from '../services/evaluationService';

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDateVN = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatTimeVN = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatDateTimeVN = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 17) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

const getPeriodProgress = (period) => {
  if (!period?.startDate || !period?.endDate) return null;

  const start = new Date(period.startDate).getTime();
  const end = new Date(period.endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;

  const now = Date.now();
  const progress = ((now - start) / (end - start)) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
};

const getPeriodWeekLabel = (period) => {
  if (!period?.startDate || !period?.endDate) return '';

  const start = new Date(period.startDate).getTime();
  const end = new Date(period.endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return '';

  const totalWeeks = Math.max(1, Math.ceil((end - start) / (7 * DAY_MS)));
  const currentWeek = Math.max(1, Math.min(totalWeeks, Math.floor((Date.now() - start) / (7 * DAY_MS)) + 1));
  return `Tuần ${currentWeek}/${totalWeeks}`;
};

const getDaysLeft = (value) => {
  if (!value) return null;
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return null;
  return Math.max(0, Math.ceil((target - Date.now()) / DAY_MS));
};

const getPriority = (daysLeft) => {
  if (daysLeft == null) return 'TB';
  if (daysLeft <= 7) return 'Cao';
  if (daysLeft <= 14) return 'TB';
  return 'Thấp';
};

const getActivityTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.floor((startToday - startDate) / DAY_MS);
  const time = formatTimeVN(date);

  if (diffDays <= 0) return `Hôm nay, ${time}`;
  if (diffDays === 1) return `Hôm qua, ${time}`;
  if (diffDays < 7) return `${diffDays} ngày trước, ${time}`;
  return formatDateTimeVN(date);
};

function HomePage() {
  const [profile, setProfile] = useState(null);
  const [reports, setReports] = useState([]);
  const [checkIns, setCheckIns] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [weeklyReportsSeries, setWeeklyReportsSeries] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [user, setUser] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        setUser(null);
      }
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [profileResult, reportsResult, checkInsResult, periodsResult, summaryResult] = await Promise.allSettled([
          getMyProfile(),
          getMyReports(),
          getMyCheckIns(),
          getAllPeriods(),
          getMySummary(),
        ]);

        if (profileResult.status === 'fulfilled' && profileResult.value?.success) {
          setProfile(profileResult.value.data || null);
        }

        if (reportsResult.status === 'fulfilled' && reportsResult.value?.success) {
          setReports(reportsResult.value.data || []);
        }

        if (checkInsResult.status === 'fulfilled' && checkInsResult.value?.success) {
          setCheckIns(checkInsResult.value.data || []);
        }

        if (periodsResult.status === 'fulfilled' && periodsResult.value?.success) {
          const loadedPeriods = periodsResult.value.data || [];
          setPeriods(loadedPeriods);
        }

        if (summaryResult.status === 'fulfilled' && summaryResult.value?.success) {
          setSummary(summaryResult.value.data || null);
        }

        const loadedPeriods = periodsResult.status === 'fulfilled' && periodsResult.value?.success
          ? periodsResult.value.data || []
          : [];
        const selectedPeriodId = profileResult.status === 'fulfilled' && profileResult.value?.success
          ? profileResult.value.data?.periodId || null
          : null;
        const currentPeriod = loadedPeriods.find((period) => String(period.id) === String(selectedPeriodId)) || loadedPeriods.find((period) => period.status === 'ONGOING') || loadedPeriods.find((period) => {
          if (!period.startDate || !period.endDate) return false;
          const start = new Date(period.startDate).getTime();
          const end = new Date(period.endDate).getTime();
          const now = Date.now();
          return !Number.isNaN(start) && !Number.isNaN(end) && start <= now && now <= end;
        }) || loadedPeriods[0] || null;

        const periodId = selectedPeriodId || currentPeriod?.id;
        const [scheduleResult, meetingResult] = await Promise.allSettled([
          getSchedules(periodId),
          getMeetings(periodId),
        ]);

        // fetch tasks for stat card and task list
        setTaskLoading(true);
        try {
          const tasksRes = await getMyTasks(periodId);
          if (tasksRes?.success) {
            setTasks(tasksRes.data || []);
          }
        } catch (e) {
          // ignore
        } finally {
          setTaskLoading(false);
        }

        // fetch weekly reports series for sparkline (user-scoped)
        try {
          const weeklyRes = await getMyWeeklyReports(periodId);
          if (weeklyRes?.success && Array.isArray(weeklyRes.data)) {
            const data = weeklyRes.data;
            const counts = data.map((item) => {
              if (typeof item.count === 'number') return item.count;
              if (Array.isArray(item.reports)) return item.reports.length;
              if (typeof item.submissionCount === 'number') return item.submissionCount;
              if (item.submissionStatus && item.submissionStatus !== 'UNSUBMITTED') return 1;
              return 0;
            });
            const trimmed = counts.slice(-8);
            setWeeklyReportsSeries(trimmed.length > 0 ? trimmed : [0]);
          }
        } catch (e) {
          // ignore
        }

        if (scheduleResult.status === 'fulfilled' && scheduleResult.value?.success) {
          setSchedules(scheduleResult.value.data || []);
        }

        if (meetingResult.status === 'fulfilled' && meetingResult.value?.success) {
          setMeetings(meetingResult.value.data || []);
        }
        // fetch tasks separately (using taskService)
        try {
          const tasksRes = await getMyTasks(periodId);
          if (tasksRes?.success) {
            // store tasks in schedules place if schedules API isn't used for tasks
            // but we'll create a dedicated tasks state below
            // no-op here
          }
        } catch (e) {
          // ignore
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const displayName = profile?.fullName || user?.name || user?.fullName || user?.email?.split('@')[0] || 'bạn';
  const normalizedName = displayName
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const currentPeriod = useMemo(() => {
    if (!periods.length) return null;

    const now = Date.now();
    return periods.find((period) => period.status === 'ONGOING') || periods.find((period) => {
      if (!period.startDate || !period.endDate) return false;
      const start = new Date(period.startDate).getTime();
      const end = new Date(period.endDate).getTime();
      return !Number.isNaN(start) && !Number.isNaN(end) && start <= now && now <= end;
    }) || periods[0] || null;
  }, [periods]);

  const heroTags = [
    profile?.majorName,
    profile?.enterpriseName,
    profile?.className,
    currentPeriod?.name,
    getPeriodWeekLabel(currentPeriod),
  ].filter(Boolean);

  const progressPercent = getPeriodProgress(currentPeriod);

  const averageScore = summary?.averageScore != null ? Number(summary.averageScore) : null;

  const overviewCards = [
    progressPercent != null ? { title: 'Tiến độ', value: `${progressPercent}%`, subtitle: currentPeriod?.name || 'Đợt hiện tại', icon: '📈' } : null,
    reports.length ? { title: 'Báo cáo', value: reports.length, subtitle: 'Đã nộp', icon: '📝' } : null,
    {
      title: 'Điểm TB',
      value: averageScore != null ? averageScore.toFixed(1) : '—',
      subtitle: averageScore != null
        ? (summary?.scoreCount ? `${summary.scoreCount} lần chấm` : 'Điểm mentor')
        : 'Chưa có điểm',
      icon: '⭐',
    },
    { title: 'Nhiệm vụ', value: tasks.length || 0, subtitle: 'Cần hoàn thành', icon: '📌' },
  ].filter(Boolean);

  const taskItems = useMemo(() => {
    const taskCards = (tasks || [])
      .slice(0, 4)
      .map((task) => {
        const deadline = task.deadline || task.dueDate;
        const daysLeft = getDaysLeft(deadline);
        const priority = task.priority === 'HIGH' ? 'Cao' : task.priority === 'MEDIUM' ? 'TB' : 'Thấp';
        const statusText = task.status === 'DONE' ? 'Hoàn thành' : task.status === 'REVIEW' ? 'Đang review' : 'Đang làm';
        return {
          id: task.id,
          title: task.title,
          internshipId: task.internshipId || (task.Internship ? task.Internship.id : null),
          status: statusText,
          badge: task.category || 'Nhiệm vụ',
          days: daysLeft ?? 0,
          priority,
          date: deadline ? formatDateVN(deadline) : 'Chưa có hạn',
        };
      });

    const scheduleCards = schedules
      .map((schedule) => {
        const daysLeft = getDaysLeft(schedule.endDate || schedule.startDate);
        const priority = getPriority(daysLeft);
        const badge = schedule.type === 'MEETING' ? 'Lịch họp' : schedule.type === 'DEADLINE' ? 'Hạn việc' : 'Đang làm';

        return {
          id: schedule.id,
          title: schedule.title,
          status: badge,
          badge,
          days: daysLeft ?? 0,
          priority,
          date: formatDateVN(schedule.endDate || schedule.startDate),
        };
      })
      .filter((item) => item.title);

    return [...taskCards, ...scheduleCards].slice(0, 4);
  }, [tasks, schedules]);

  const activityItems = useMemo(() => {
    const items = [];

    checkIns.slice(0, 3).forEach((checkIn) => {
      items.push({
        icon: '✅',
        title: `Check-in lúc ${checkIn.time || 'không rõ'}`,
        time: getActivityTime(checkIn.createdAt || checkIn.date),
        note: checkIn.status === 'LATE' ? 'Muộn' : 'Đúng giờ',
        color: checkIn.status === 'LATE' ? 'yellow' : 'green',
        sortKey: new Date(checkIn.createdAt || checkIn.date || Date.now()).getTime(),
      });
    });

    reports.slice(0, 3).forEach((report) => {
      items.push({
        icon: '📄',
        title: report.weekNumber ? `Nộp báo cáo tuần ${report.weekNumber}` : 'Nộp báo cáo',
        time: getActivityTime(report.createdAt),
        note: report.status === 'APPROVED' ? 'Đã duyệt' : report.status === 'REJECTED' ? 'Cần chỉnh sửa' : 'Chờ duyệt',
        color: report.status === 'APPROVED' ? 'green' : report.status === 'REJECTED' ? 'red' : 'yellow',
        sortKey: new Date(report.createdAt || Date.now()).getTime(),
      });
    });

    meetings.slice(0, 2).forEach((meeting) => {
      items.push({
        icon: '📅',
        title: meeting.title || 'Lịch họp',
        time: meeting.meetingDate ? `${formatDateVN(meeting.meetingDate)}${meeting.meetingTime ? `, ${meeting.meetingTime}` : ''}` : 'Sắp diễn ra',
        note: 'Lịch họp',
        color: 'yellow',
        sortKey: new Date(meeting.meetingDate || Date.now()).getTime(),
      });
    });

    tasks.slice(0, 2).forEach((task) => {
      items.push({
        icon: '📌',
        title: task.title || 'Nhiệm vụ mới',
        time: task.deadline ? `Hạn: ${formatDateVN(task.deadline)}` : 'Chưa có hạn',
        note: task.status === 'DONE' ? 'Hoàn thành' : 'Đang thực hiện',
        color: task.status === 'DONE' ? 'green' : 'yellow',
        sortKey: new Date(task.updatedAt || task.createdAt || Date.now()).getTime(),
      });
    });

    return items.sort((left, right) => right.sortKey - left.sortKey).slice(0, 6);
  }, [checkIns, meetings, reports, tasks]);

  const recentReports = reports.slice(0, 3);
  const mentor = profile?.mentorName || profile?.mentor?.name || profile?.mentorName
    ? {
        avatar: profile?.avatar || profile?.profileImageUrl || '',
        name: profile?.mentorName || profile?.mentor?.name || 'Người hướng dẫn',
        role: profile?.enterpriseName || profile?.mentor?.role || 'Người hướng dẫn',
      }
    : null;

  const canShowRightColumn = Boolean(mentor || progressPercent != null || recentReports.length);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setProfile(null);
    setReports([]);
    setCheckIns([]);
    setMeetings([]);
    setSchedules([]);
    setPeriods([]);
    navigate('/');
  };

  return (
    <div className="dashboard-grid home-page">
      <section className="hero-wide">
        <div className="hero-left">
          <h2>{getGreeting()},</h2>
          <h1>{user ? normalizedName : 'đăng nhập ngay'}</h1>
          <p className="hero-subtitle">
            {profile?.majorName || 'Thực tập sinh'}{profile?.enterpriseName ? ` · ${profile.enterpriseName}` : ''}
          </p>
          {heroTags.length > 0 && (
            <div className="hero-tags">
              {heroTags.map((tag, index) => (
                <span className="tag" key={`${tag}-${index}`}>{tag}</span>
              ))}
            </div>
          )}
        </div>
        <div className="hero-actions-right">
          {user ? (
            <>
              <button className="btn" onClick={() => navigate('/checkin')}>Check-in</button>
              <button className="btn" onClick={() => navigate('/reports')}>Nộp báo cáo</button>
              <button className="btn" onClick={handleLogout}>Đăng xuất</button>
            </>
          ) : (
            <>
              <button className="btn outline" onClick={() => navigate('/login')}>Đăng nhập</button>
              <button className="btn" onClick={() => navigate('/login')}>Đăng ký</button>
            </>
          )}
        </div>
      </section>

      {loading && user && <section className="card home-loading">Đang tải dữ liệu...</section>}
      {!loading && user && taskLoading && <section className="card home-loading">Đang tải nhiệm vụ...</section>}

          {overviewCards.length > 0 && (
            <section className="stats-row">
              {overviewCards.map((item) => (
                <StatCard
                  key={item.title}
                  title={item.title}
                  value={item.value}
                  subtitle={item.subtitle}
                  icon={item.icon}
                  sparkline={item.title === 'Báo cáo' ? weeklyReportsSeries : undefined}
                />
              ))}
            </section>
          )}

      {(taskItems.length > 0 || activityItems.length > 0 || canShowRightColumn) && (
        <section className={`main-columns ${canShowRightColumn ? '' : 'main-columns--single'}`}>
          <div className="col-left">
            {taskItems.length > 0 && <TaskList tasks={taskItems} />}
            {activityItems.length > 0 && <ActivityList items={activityItems} />}
          </div>

          {canShowRightColumn && (
            <div className="col-right">
              {mentor && <MentorCard mentor={mentor} />}

              {progressPercent != null && (
                <div className="card overview-card">
                  <div className="card-header">
                    <h3>Tiến độ tổng quan</h3>
                    {currentPeriod?.name && <span className="section-chip">{currentPeriod.name}</span>}
                  </div>
                  <div className="overview-progress-value">{progressPercent}%</div>
                  <div className="overview-progress-label">tiến độ</div>
                  <div className="report-summary-grid compact-grid">
                    {reports.length > 0 && (
                      <div className="report-card-small">
                        <p className="report-label">Báo cáo</p>
                        <h3>{reports.length}</h3>
                      </div>
                    )}
                    {checkIns.length > 0 && (
                      <div className="report-card-small">
                        <p className="report-label">Check-in</p>
                        <h3>{checkIns.length}</h3>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {recentReports.length > 0 && (
                <div className="card report-board compact-report-board">
                  <div className="report-header">
                    <div>
                      <h3>Báo cáo gần đây</h3>
                      <p>{recentReports.length} báo cáo mới nhất từ bạn.</p>
                    </div>
                    <button className="btn outline" onClick={() => navigate('/reports')}>Xem tất cả</button>
                  </div>

                  <ul className="recent-report-list">
                    {recentReports.map((report) => (
                      <li
                        key={report.id || `${report.weekNumber}-${report.createdAt}`}
                        className="recent-report-item"
                        onClick={async () => {
                          setSelectedReport(report);
                          setSelectedEvaluation(null);
                          setScoreModalOpen(true);
                          if (report?.internshipId) {
                            setEvaluationLoading(true);
                            try {
                              const res = await getEvaluationByInternship(report.internshipId);
                              if (res?.success) {
                                setSelectedEvaluation(res.data || null);
                              }
                            } catch (e) {
                              setSelectedEvaluation(null);
                            } finally {
                              setEvaluationLoading(false);
                            }
                          }
                        }}
                      >
                        <div>
                          <div className="recent-report-title">
                            {report.weekNumber ? `Tuần ${report.weekNumber}` : 'Báo cáo'}
                          </div>
                          <div className="recent-report-meta">
                            {formatDateTimeVN(report.createdAt) || formatDateVN(report.createdAt)}
                          </div>
                        </div>
                        <span className={`report-status ${report.status === 'APPROVED' ? 'approved' : report.status === 'REJECTED' ? 'rejected' : 'pending'}`}>
                          {report.status === 'APPROVED' ? 'Đã duyệt' : report.status === 'REJECTED' ? 'Cần chỉnh sửa' : 'Chờ duyệt'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {!loading && user && taskItems.length === 0 && activityItems.length === 0 && !canShowRightColumn && (
        <section className="card home-empty-note">
          Chưa có dữ liệu để hiển thị trên trang home. Khi backend có báo cáo, check-in, lịch làm việc hoặc mentor, các khối này sẽ tự bật lên.
        </section>
      )}

      {!user && (
        <section className="card home-empty-note">
          Đăng nhập để xem tiến độ, báo cáo, check-in và các thông tin thực tập của bạn.
        </section>
      )}
      <ReportScoreModal
        open={scoreModalOpen}
        report={selectedReport}
        evaluation={selectedEvaluation}
        onClose={() => { setScoreModalOpen(false); setSelectedReport(null); setSelectedEvaluation(null); }}
      />
    </div>
  );
}

export default HomePage;