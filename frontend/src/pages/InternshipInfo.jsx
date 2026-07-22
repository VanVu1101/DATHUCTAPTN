import { useEffect, useMemo, useState } from 'react';
import { getMyProfile, getStoredProfile } from '../services/studentService';
import { getMyGoals, createGoal, deleteGoal, updateGoal } from '../services/goalService';
import { getMyTasks } from '../services/taskService';
import { getMyReports } from '../services/reportService';
import '../App.css';

const STATUS_LABELS = {
  PENDING: 'Chờ duyệt',
  IN_PROGRESS: 'Đang thực hiện',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
  COMPLETED: 'Hoàn thành'
};

const STATUS_CLASS = {
  PENDING: 'status-warning',
  IN_PROGRESS: 'status-neutral',
  APPROVED: 'status-done',
  REJECTED: 'status-danger',
  COMPLETED: 'status-done'
};

function formatDateVN(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function InternshipInfo() {
  const [profile, setProfile] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(getStoredProfile());
  const [editGoal, setEditGoal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    link: ''
  });
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      let stored = getStoredProfile();
      if (!stored) stored = {};
      setUser(stored);
      if (stored.profile) {
        setProfile(stored.profile);
      }

      const [profileRes, goalsRes, tasksRes, reportsRes] = await Promise.all([
        getMyProfile(),
        getMyGoals(),
        getMyTasks(stored?.periodId || undefined),
        getMyReports()
      ]);

      if (profileRes?.success) {
        setProfile(profileRes.data);
        const current = getStoredProfile() || {};
        current.profile = profileRes.data;
        localStorage.setItem('user', JSON.stringify(current));
        setUser(current);
      } else {
        setError(profileRes?.message || 'Không thể tải thông tin thực tập');
      }

      if (goalsRes?.success) {
        setGoals(goalsRes.data || []);
      }

      if (tasksRes?.success) {
        setTasks(tasksRes.data || []);
      }

      if (reportsRes?.success) {
        setReports(reportsRes.data || []);
      }
    } catch (err) {
      console.error(err);
      setError('Không thể tải dữ liệu thực tập');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setForm({ title: '', description: '', dueDate: '', link: '' });
    setEditGoal(null);
    setMessage('');
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveGoal = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setMessage('Tiêu đề là bắt buộc.');
      return;
    }

    try {
      setSaving(true);
      setMessage('');

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        dueDate: form.dueDate || null,
        link: form.link?.trim() || null
      };

      if (editGoal) {
        await updateGoal(editGoal.id, payload);
        setMessage('Cập nhật mục tiêu thành công.');
      } else {
        await createGoal(payload);
        setMessage('Đã thêm mục tiêu kỳ này.');
      }

      resetForm();
      await loadData();
    } catch (err) {
      console.error(err);
      setMessage(err?.response?.data?.message || err.message || 'Lỗi khi lưu mục tiêu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mục tiêu này?')) return;
    try {
      setActionLoading(true);
      await deleteGoal(goalId);
      setMessage('Đã xóa mục tiêu.');
      await loadData();
    } catch (err) {
      console.error(err);
      setMessage(err?.response?.data?.message || err.message || 'Lỗi khi xóa mục tiêu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewGoal = async (goalId, status) => {
    try {
      setActionLoading(true);
      await updateGoal(goalId, { status });
      setMessage(status === 'APPROVED' ? 'Mục tiêu đã được duyệt.' : 'Mục tiêu đã bị từ chối.');
      await loadData();
    } catch (err) {
      console.error(err);
      setMessage(err?.response?.data?.message || err.message || 'Lỗi khi cập nhật trạng thái mục tiêu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditGoal = (goal) => {
    setEditGoal(goal);
    setForm({
      title: goal.title || '',
      description: goal.description || '',
      dueDate: goal.dueDate ? goal.dueDate.slice(0, 10) : '',
      link: goal.link || ''
    });
    setMessage('');
  };

  const goalSummary = useMemo(() => {
    const summary = {
      total: goals.length,
      PENDING: 0,
      IN_PROGRESS: 0,
      APPROVED: 0,
      REJECTED: 0,
      COMPLETED: 0
    };

    goals.forEach((goal) => {
      summary[goal.status] = (summary[goal.status] || 0) + 1;
    });

    return summary;
  }, [goals]);

  const progress = useMemo(() => {
    if (!profile) return null;
    return {
      percent: profile.progressPercent ?? 0,
      tasksDone: profile.taskStatusCounts?.DONE ?? profile.taskSummary?.done ?? 0,
      tasksInProgress: profile.taskStatusCounts?.IN_PROGRESS ?? profile.taskSummary?.inProgress ?? 0,
      tasksReview: profile.taskStatusCounts?.REVIEW ?? profile.taskSummary?.review ?? 0,
      tasksTodo: profile.taskStatusCounts?.TODO ?? profile.taskSummary?.todo ?? 0,
      reportsSubmitted: profile.reportStatusCounts?.SUBMITTED ?? profile.reportSummary?.submitted ?? 0,
      reportsReviewed: profile.reportStatusCounts?.REVIEWED ?? profile.reportSummary?.reviewed ?? 0,
      reportsRejected: profile.reportStatusCounts?.REJECTED ?? profile.reportSummary?.rejected ?? 0,
      weeksCompleted: profile.weeksCompleted ?? 0,
      totalWeeks: profile.totalWeeks ?? 0,
      nextDeadline: profile.nextDeadline,
      latestReport: profile.latestReport
    };
  }, [profile]);

  const renderGoals = () => {
    if (!goals.length) {
      return <p className="empty-state">Chưa có mục tiêu kỳ này. Sinh viên có thể thêm mục tiêu để mentor duyệt.</p>;
    }

    return goals.map((goal) => (
      <div key={goal.id} className="goal-item">
        <div className="goal-header">
          <div>
            <strong>{goal.title}</strong>
            <div className="goal-meta">
              {goal.dueDate && <span>Hạn: {formatDateVN(goal.dueDate)}</span>}
              {goal.link && (
                <a href={goal.link} target="_blank" rel="noreferrer">Link tham khảo</a>
              )}
            </div>
          </div>
          <span className={`status-chip ${STATUS_CLASS[goal.status] || 'status-neutral'}`}>{STATUS_LABELS[goal.status] || goal.status}</span>
        </div>
        {goal.description && <p>{goal.description}</p>}
        <div className="goal-footer">
          <div className="goal-meta">
            {goal.attachmentName && goal.attachmentUrl && (
              <a href={goal.attachmentUrl} target="_blank" rel="noreferrer">{goal.attachmentName}</a>
            )}
          </div>
          <div className="goal-actions">
            {user?.role === 'STUDENT' && (
              <>
                <button className="btn outline" type="button" onClick={() => handleEditGoal(goal)} disabled={actionLoading}>Sửa</button>
                <button className="btn outline" type="button" onClick={() => handleDeleteGoal(goal.id)} disabled={actionLoading}>Xóa</button>
              </>
            )}
            {user?.role === 'ENTERPRISE' && ['PENDING', 'IN_PROGRESS'].includes(goal.status) && (
              <>
                <button className="btn" type="button" onClick={() => handleReviewGoal(goal.id, 'APPROVED')} disabled={actionLoading}>Duyệt</button>
                <button className="btn outline" type="button" onClick={() => handleReviewGoal(goal.id, 'REJECTED')} disabled={actionLoading}>Từ chối</button>
              </>
            )}
          </div>
        </div>
      </div>
    ));
  };

  const upcomingTasks = useMemo(() => profile?.progressData?.upcomingTasks || [], [profile]);

  const renderUpcomingTasks = () => {
    if (!upcomingTasks.length) {
      return <p className="empty-state">Không có nhiệm vụ sắp tới nào. Hãy theo dõi tiến độ và cập nhật nhiệm vụ mới.</p>;
    }

    return upcomingTasks.map((task) => (
      <div key={task.id} className="task-card">
        <div className="task-card-header">
          <h3>{task.title}</h3>
          <span className={`status-chip ${STATUS_CLASS[task.status] || 'status-neutral'}`}>{task.status}</span>
        </div>
        <div className="task-card-body">
          {task.deadline && <p>Deadline: {formatDateVN(task.deadline)}</p>}
          {task.priority && <p>Ưu tiên: {task.priority}</p>}
          {task.description && <p>{task.description}</p>}
          {task.fileUrl && (
            <a href={task.fileUrl} target="_blank" rel="noreferrer">{task.fileName || 'File đính kèm'}</a>
          )}
        </div>
      </div>
    ));
  };

  const renderTimeline = () => {
    const roadmap = profile?.progressData?.weeklyRoadmap || [];
    if (!roadmap.length) {
      return <p>Không có lộ trình tuần cho kỳ thực tập hiện tại.</p>;
    }

    return roadmap.map((week) => {
      const labelClass = week.roadmapStatus === 'COMPLETED' ? 'completed' : week.roadmapStatus === 'CURRENT' ? 'current' : 'upcoming';

      return (
        <div key={week.id} className={`timeline-item ${labelClass}`}>
          <div className="timeline-label">Tuần {week.weekNumber}</div>
          <div>
            <p className="timeline-title">{week.title}</p>
            <p className="timeline-date">{week.note}</p>
            {week.attachmentUrl && (
              <a href={week.attachmentUrl} target="_blank" rel="noreferrer">{week.attachmentName || 'Tài liệu tuần'}</a>
            )}
          </div>
          <span>{week.roadmapStatus === 'COMPLETED' ? 'Hoàn thành' : week.roadmapStatus === 'CURRENT' ? 'Hiện tại' : 'Sắp tới'}</span>
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="page-shell internship-info-page">
        <h1>Thông tin thực tập</h1>
        <div className="card">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="page-shell internship-info-page">
      <section className="hero-panel">
        <div>
          <p className="hero-eyebrow">Thông tin thực tập</p>
          <h1>Theo dõi tiến độ và mục tiêu kỳ thực tập</h1>
          <p className="hero-subtitle">Giữ tổng quan công việc, roadmap tuần và các mục tiêu đã duyệt ở cùng một nơi.</p>
        </div>
        <div className="hero-badges">
          <span className="hero-badge">📈 Tiến độ rõ ràng</span>
          <span className="hero-badge">🎯 Mục tiêu theo tuần</span>
        </div>
      </section>

      {error && <div className="card error-card">{error}</div>}
      {message && <div className="card info-card">{message}</div>}

      <div className="overview-grid">
        <section className="card section-card">
          <h2>📋 Chi tiết kỳ thực tập</h2>
          <div className="info-grid">
            <div>
              <strong>Doanh nghiệp</strong>
              <p>{profile?.enterpriseName || 'Chưa cập nhật'}</p>
            </div>
            <div>
              <strong>Người hướng dẫn</strong>
              <p>{profile?.mentorDetails?.mentorName || profile?.mentorName || 'Chưa cập nhật'}</p>
              {profile?.mentorDetails?.mentorEmail && <p>Email: {profile.mentorDetails.mentorEmail}</p>}
              {profile?.mentorDetails?.mentorPhone && <p>Phone: {profile.mentorDetails.mentorPhone}</p>}
            </div>
            <div>
              <strong>Ngành</strong>
              <p>{profile?.majorName || 'Chưa cập nhật'}</p>
            </div>
            <div>
              <strong>Đợt thực tập</strong>
              <p>{profile?.periodName || 'Chưa phân công'}</p>
            </div>
            <div>
              <strong>Thời gian</strong>
              <p>{profile?.internshipDuration || 'Chưa cập nhật'}</p>
            </div>
          </div>
        </section>

        <section className="card progress-card section-card">
          <h2>📈 Tiến độ thực tập</h2>
          <div className="progress-summary">
            <div>
              <strong>Hoàn thành</strong>
              <p>{progress?.percent ?? 0}%</p>
              <div className="progress-bar-shell">
                <div className="progress-bar-fill" style={{ width: `${Math.min(100, Math.max(0, progress?.percent ?? 0))}%` }} />
              </div>
            </div>
            <div>
              <strong>Tuần đã qua</strong>
              <p>{progress?.weeksCompleted ?? 0}/{progress?.totalWeeks ?? 0}</p>
            </div>
            <div>
              <strong>Deadline tiếp theo</strong>
              <p>{progress?.nextDeadline ? formatDateVN(progress.nextDeadline) : 'Chưa có'}</p>
            </div>
          </div>
          <div className="progress-stats">
            <div>
              <strong>Task DONE</strong>
              <p>{progress?.tasksDone ?? 0}</p>
            </div>
            <div>
              <strong>Task IN_PROGRESS</strong>
              <p>{progress?.tasksInProgress ?? 0}</p>
            </div>
            <div>
              <strong>Task REVIEW</strong>
              <p>{progress?.tasksReview ?? 0}</p>
            </div>
            <div>
              <strong>Task TODO</strong>
              <p>{progress?.tasksTodo ?? 0}</p>
            </div>
            <div>
              <strong>Báo cáo SUBMITTED</strong>
              <p>{progress?.reportsSubmitted ?? 0}</p>
            </div>
            <div>
              <strong>Báo cáo REVIEWED</strong>
              <p>{progress?.reportsReviewed ?? 0}</p>
            </div>
            <div>
              <strong>Báo cáo REJECTED</strong>
              <p>{progress?.reportsRejected ?? 0}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="split-grid">
        <section className="card section-card">
          <h2>🎯 Mục tiêu kỳ này</h2>
          <div className="goal-summary-grid">
            <div>
              <strong>Tổng mục tiêu</strong>
              <p>{goalSummary.total}</p>
            </div>
            <div>
              <strong>Chờ duyệt</strong>
              <p>{goalSummary.PENDING}</p>
            </div>
            <div>
              <strong>Đang thực hiện</strong>
              <p>{goalSummary.IN_PROGRESS}</p>
            </div>
            <div>
              <strong>Đã duyệt</strong>
              <p>{goalSummary.APPROVED}</p>
            </div>
            <div>
              <strong>Đã từ chối</strong>
              <p>{goalSummary.REJECTED}</p>
            </div>
            <div>
              <strong>Hoàn thành</strong>
              <p>{goalSummary.COMPLETED}</p>
            </div>
          </div>
        </section>

        <section className="card section-card">
          <h2>🗂️ Nhiệm vụ sắp tới</h2>
          <div className="timeline-list">{renderUpcomingTasks()}</div>
        </section>
      </div>

      {user?.role === 'STUDENT' && (
        <section className="card form-card">
          <h2>{editGoal ? 'Chỉnh sửa mục tiêu' : 'Thêm mục tiêu mới'}</h2>
          <form onSubmit={handleSaveGoal} className="form-stack">
            <label>
              Tiêu đề
              <input name="title" value={form.title} onChange={handleFieldChange} placeholder="Tiêu đề mục tiêu" />
            </label>
            <label>
              Mô tả
              <textarea name="description" value={form.description} onChange={handleFieldChange} placeholder="Mô tả chi tiết" rows={4} />
            </label>
            <label>
              Hạn hoàn thành
              <input type="date" name="dueDate" value={form.dueDate} onChange={handleFieldChange} />
            </label>
            <label>
              Link tham khảo
              <input name="link" value={form.link} onChange={handleFieldChange} placeholder="Link tham khảo" />
            </label>
            <div className="form-actions">
              <button type="submit" className="btn primary" disabled={saving}>{editGoal ? 'Cập nhật mục tiêu' : 'Thêm mục tiêu'}</button>
              {editGoal && (
                <button type="button" className="btn outline" onClick={resetForm} disabled={saving}>Hủy</button>
              )}
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="card-header">
          <h2>📝 Danh sách mục tiêu</h2>
          <span className="badge">{user?.role === 'ENTERPRISE' ? 'Mentor duyệt mục tiêu' : 'Sinh viên quản lý mục tiêu'}</span>
        </div>
        <div className="goal-list">{renderGoals()}</div>
      </section>

      <section className="card timeline-card">
        <h2>🧭 Lộ trình tuần</h2>
        <div className="timeline-list">{renderTimeline()}</div>
      </section>
    </div>
  );
}

export default InternshipInfo;
