import '../App.css';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { notifyError } from '../utils/toast';
import { getSchedules } from '../services/scheduleService';
import { getMeetings } from '../services/meetingService';
import AppCard from '../components/AppCard';
import AppButton from '../components/AppButton';

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upcomingItems, setUpcomingItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const user = stored ? JSON.parse(stored) : null;
    if (!user || user.role !== 'ADMIN') {
      navigate('/', { replace: true });
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const [ds, scheduleRes, meetingRes] = await Promise.allSettled([
          (await import('../services/dashboardService')).getStats(),
          getSchedules(),
          getMeetings(),
        ]);

        if (ds.status === 'fulfilled' && ds.value?.success) setStats(ds.value.data);
        else notifyError(ds?.value?.message || 'Không tải được dữ liệu dashboard');

        const items = [];
        if (scheduleRes.status === 'fulfilled' && scheduleRes.value?.success) {
          (scheduleRes.value.data || []).forEach((schedule) => {
            items.push({
              id: `schedule-${schedule.id}`,
              title: schedule.title || 'Lịch công việc',
              subtitle: `${schedule.startDate || ''}${schedule.endDate && schedule.startDate !== schedule.endDate ? ` → ${schedule.endDate}` : ''}`,
              badge: 'Công việc',
              sortKey: `${schedule.endDate || schedule.startDate || '9999-12-31'}T${schedule.endTime || schedule.startTime || '23:59'}`,
            });
          });
        }

        if (meetingRes.status === 'fulfilled' && meetingRes.value?.success) {
          (meetingRes.value.data || []).forEach((meeting) => {
            items.push({
              id: `meeting-${meeting.id}`,
              title: meeting.title || 'Lịch họp',
              subtitle: `${meeting.meetingDate || ''}${meeting.meetingTime ? ` · ${meeting.meetingTime}` : ''}`,
              badge: 'Họp',
              sortKey: `${meeting.meetingDate || '9999-12-31'}T${meeting.meetingTime || '23:59'}`,
            });
          });
        }

        setUpcomingItems(items.sort((a, b) => a.sortKey.localeCompare(b.sortKey)).slice(0, 5));
      } catch (e) {
        notifyError('Không tải được dữ liệu dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const overviewItems = [
    { title: 'Sinh viên', value: stats?.overview?.totalStudents ?? '—', subtitle: 'Tổng số tài khoản học viên', to: '/students' },
    { title: 'SV đã có mentor', value: stats?.overview?.assignedStudents ?? '—', subtitle: 'Sinh viên được phân công mentor', to: '/students?mentorAssigned=true' },
    { title: 'SV chưa có mentor', value: stats?.overview?.unassignedStudents ?? '—', subtitle: 'Sinh viên cần phân công', to: '/students?mentorAssigned=false' },
    { title: 'Check-in', value: stats?.overview?.totalCheckIns ?? '—', subtitle: 'Số lượt điểm danh', to: '/checkin' },
    { title: 'Tin nhắn', value: stats?.overview?.activeChats ?? '—', subtitle: 'Hội thoại đang hoạt động', to: '/chat' },
    { title: 'Doanh nghiệp', value: stats?.overview?.totalEnterprises ?? '—', subtitle: 'Đối tác đang kết nối', to: '/mentors' }
  ];

  const progressPercent = stats?.progress?.completedPercent ?? 0;
  const progress = Math.max(0, Math.min(100, progressPercent));
  const chartSeries = [
    { label: 'Sinh viên', value: Math.max(18, Number(stats?.overview?.totalStudents ?? 0) || 18), color: '#2563eb' },
    { label: 'Check-in', value: Math.max(18, Number(stats?.overview?.totalCheckIns ?? 0) || 18), color: '#06b6d4' },
    { label: 'Tin nhắn', value: Math.max(18, Number(stats?.overview?.activeChats ?? 0) || 18), color: '#7c3aed' },
    { label: 'Báo cáo', value: Math.max(18, (stats?.recentReports?.length || 0) * 10 + 12), color: '#f59e0b' },
    { label: 'Nhiệm vụ', value: Math.max(18, (stats?.recentTasks?.length || 0) * 10 + 8), color: '#16a34a' },
  ];
  const maxChartValue = Math.max(...chartSeries.map((item) => item.value), 1);

  return (
    <div className="dashboard-shell">
      <PageHeader
        title="Dashboard"
        description="Giám sát hoạt động thực tập một cách chuyên nghiệp"
        actions={[
          <button key="students" className="btn btn-secondary" onClick={() => navigate('/students')}>Quản lý sinh viên</button>,
          <button key="reports" className="btn btn-primary" onClick={() => navigate('/reports')}>Xem báo cáo</button>,
          <button key="users" className="btn btn-secondary" onClick={() => navigate('/users')}>Quản lý người dùng</button>
        ]}
      />

      <section className="dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">Bảng điều khiển quản trị</p>
          <h1>Giám sát hoạt động thực tập một cách chuyên nghiệp</h1>
          <p className="dashboard-subtitle">Theo dõi tiến độ, báo cáo, công việc và hoạt động điểm danh từ một trung tâm điều hành.</p>
        </div>
        <div className="dashboard-actions">
          <AppButton variant="ghost" onClick={() => navigate('/students')}>Quản lý sinh viên</AppButton>
          <AppButton variant="primary" onClick={() => navigate('/reports')}>Xem báo cáo</AppButton>
          <AppButton variant="secondary" onClick={() => navigate('/users')}>Quản lý người dùng</AppButton>
        </div>
      </section>

      {loading ? (
        <section className="loading-grid">
          <div className="skeleton" style={{ height: 92, borderRadius: 20 }} />
          <div className="stats-grid">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="skeleton" style={{ height: 132, borderRadius: 18 }} />)}
          </div>
        </section>
      ) : (
      <section className="stats-grid">
        {overviewItems.map((item) => (
          <div
            className="stat-card"
            key={item.title}
            role="link"
            tabIndex="0"
            onClick={() => navigate(item.to)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') navigate(item.to);
            }}
          >
            <h3>{item.title}</h3>
            <p>{item.value}</p>
            <span>{item.subtitle}</span>
          </div>
        ))}
      </section>
      )}

      <section className="dashboard-columns">
        <div className="card">
          <div className="card-header">
            <h3>Tiến độ công việc</h3>
            <span className="badge">{progress}% hoàn thành</span>
          </div>
          <div className="progress-track-large">
            <div className="progress-fill-large" style={{ width: `${progress}%` }} />
          </div>
          <div className="metric-row">
            <div>
              <strong>{stats?.progress?.completedTasks ?? 0}</strong>
              <span>Đã xong</span>
            </div>
            <div>
              <strong>{stats?.progress?.inProgressTasks ?? 0}</strong>
              <span>Đang làm</span>
            </div>
            <div>
              <strong>{stats?.progress?.overdueTasks ?? 0}</strong>
              <span>Quá hạn</span>
            </div>
          </div>
          <ul className="insight-list">
            {(stats?.insights || []).map((item) => (
              <li key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.value}</span>
                <small>{item.detail}</small>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Báo cáo gần đây</h3>
            <span className="badge">Theo dõi nhanh</span>
          </div>
          <ul className="timeline-list">
            {(stats?.recentReports || []).length === 0 ? (
              <li className="empty-state-card">Chưa có báo cáo nào được ghi nhận.</li>
            ) : (
              stats.recentReports.map((report) => (
                <li key={report.id}>
                  <div>
                    <strong>Tuần {report.weekNumber}</strong>
                    <p>{report.studentName}</p>
                  </div>
                  <span>{report.status}</span>
                  <small>{report.submittedAt}</small>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="dashboard-columns">
        <div className="card">
          <div className="card-header">
            <h3>Sự kiện sắp tới</h3>
            <span className="badge">Lịch họp & công việc</span>
          </div>
          {upcomingItems.length === 0 ? (
            <div className="empty-state-card">Chưa có sự kiện nào sắp diễn ra.</div>
          ) : (
            <ul className="timeline-list">
              {upcomingItems.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.subtitle}</p>
                  </div>
                  <span>{item.badge}</span>
                  <small>{item.sortKey.slice(0, 10)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Công việc cần ưu tiên</h3>
            <span className="badge">Deadline gần nhất</span>
          </div>
          <ul className="timeline-list">
            {(stats?.recentTasks || []).length === 0 ? (
              <li className="empty-state-card">Chưa có task nào được giao.</li>
            ) : (
              stats.recentTasks.map((task) => (
                <li key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.studentName}</p>
                  </div>
                  <span>{task.priority}</span>
                  <small>{task.deadline}</small>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <section className="dashboard-columns single-column">
        <div className="card dashboard-chart-card">
          <div className="card-header">
            <div>
              <h3>Tổng hợp hoạt động tuần</h3>
              <p className="card-subtitle">Xu hướng chỉ số cốt lõi trong hệ thống thực tập</p>
            </div>
            <span className="badge">Demo-ready</span>
          </div>
          <div className="chart-shell">
            <div className="chart-bars">
              {chartSeries.map((item) => {
                const height = Math.max(16, Math.round((item.value / maxChartValue) * 100));
                return (
                  <div key={item.label} className="chart-bar-item">
                    <div className="chart-bar-track">
                      <div className="chart-bar-fill" style={{ height: `${height}%`, background: item.color }} />
                    </div>
                    <span className="chart-bar-label">{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
