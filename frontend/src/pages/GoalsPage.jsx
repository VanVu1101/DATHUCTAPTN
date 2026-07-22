import { useEffect, useMemo, useState } from 'react';
import '../App.css';
import { createGoal, deleteGoal, getMyGoals, updateGoal, uploadGoalAttachment } from '../services/goalService';
import { getStoredProfile } from '../services/studentService';
import { notifyError, notifySuccess } from '../utils/toast';

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

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function isImageAttachment(fileName = '') {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName);
}

function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', link: '' });
  const [errors, setErrors] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [userRole, setUserRole] = useState(() => getStoredProfile()?.role || 'STUDENT');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('created');
  const [searchTerm, setSearchTerm] = useState('');

  const loadGoals = async () => {
    setLoading(true);
    try {
      const res = await getMyGoals();
      if (res?.success) {
        setGoals(res.data || []);
        setErrors((prev) => ({ ...prev, api: '' }));
      } else {
        setErrors((prev) => ({ ...prev, api: res?.message || 'Không tải được danh sách mục tiêu.' }));
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, api: err?.response?.data?.message || 'Không tải được danh sách mục tiêu.' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
    setUserRole(getStoredProfile()?.role || 'STUDENT');
  }, []);

  const summary = useMemo(() => {
    const initial = { total: goals.length, PENDING: 0, IN_PROGRESS: 0, APPROVED: 0, REJECTED: 0, COMPLETED: 0 };
    goals.forEach((goal) => {
      initial[goal.status] = (initial[goal.status] || 0) + 1;
    });
    return initial;
  }, [goals]);

  const completionRate = useMemo(() => {
    if (!summary.total) return 0;
    return Math.round(((summary.COMPLETED + summary.APPROVED) / summary.total) * 100);
  }, [summary]);

  const filteredAndSortedGoals = useMemo(() => {
    let result = goals;

    // Filter by status
    if (filterStatus !== 'ALL') {
      result = result.filter((goal) => goal.status === filterStatus);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((goal) =>
        goal.title.toLowerCase().includes(term) ||
        goal.description?.toLowerCase().includes(term)
      );
    }

    // Sort
    if (sortBy === 'deadline') {
      result = result.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
    } else if (sortBy === 'created') {
      result = result.sort((a, b) => new Date(b.id) - new Date(a.id));
    }

    return result;
  }, [goals, filterStatus, sortBy, searchTerm]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    
    // Real-time validation
    const fieldErrors = {};
    if (name === 'title') {
      if (!value.trim()) {
        fieldErrors.title = 'Tiêu đề là bắt buộc.';
      } else if (value.trim().length > 120) {
        fieldErrors.title = `Tiêu đề tối đa 120 ký tự (hiện có ${value.length}).`;
      }
    }
    if (name === 'description' && value.trim().length > 500) {
      fieldErrors.description = `Mô tả tối đa 500 ký tự (hiện có ${value.length}).`;
    }
    if (name === 'dueDate' && value) {
      const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(value);
      if (!dateMatch) {
        fieldErrors.dueDate = 'Ngày không hợp lệ (định dạng: YYYY-MM-DD).';
      } else {
        const parsed = new Date(`${value}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) {
          fieldErrors.dueDate = 'Ngày không hợp lệ.';
        }
      }
    }
    if (name === 'link' && value.trim() && !isValidUrl(value.trim())) {
      fieldErrors.link = 'Link tham khảo không hợp lệ (phải bắt đầu với http:// hoặc https://).';
    }
    
    setErrors((prev) => ({ ...prev, ...fieldErrors }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = 'Tiêu đề là bắt buộc.';
    } else if (form.title.trim().length > 120) {
      nextErrors.title = 'Tiêu đề tối đa 120 ký tự.';
    }

    if (form.description.trim().length > 500) {
      nextErrors.description = 'Mô tả tối đa 500 ký tự.';
    }

    if (form.dueDate) {
      const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(form.dueDate);
      if (!dateMatch) {
        nextErrors.dueDate = 'Ngày không hợp lệ.';
      } else {
        const parsed = new Date(`${form.dueDate}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) {
          nextErrors.dueDate = 'Ngày không hợp lệ.';
        }
      }
    }

    if (form.link.trim() && !isValidUrl(form.link.trim())) {
      nextErrors.link = 'Link tham khảo không hợp lệ.';
    }

    return nextErrors;
  };

  // Check if form is valid (for disabling submit button)
  const formIsValid = useMemo(() => {
    const titleOk = form.title.trim() && form.title.length <= 120;
    const descriptionOk = form.description.length <= 500;
    const dateOk = !form.dueDate || /^\d{4}-\d{2}-\d{2}$/.test(form.dueDate);
    const linkOk = !form.link.trim() || isValidUrl(form.link.trim());
    return titleOk && descriptionOk && dateOk && linkOk && !submitting && !uploadingAttachment;
  }, [form, submitting, uploadingAttachment]);

  const resetForm = () => {
    setForm({ title: '', description: '', dueDate: '', link: '' });
    setEditingGoal(null);
    setErrors({});
    setSelectedFile(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      notifyError('Vui lòng kiểm tra lại thông tin mục tiêu.');
      return;
    }

    try {
      setSubmitting(true);
      let attachmentPayload = {};

      if (selectedFile) {
        setUploadingAttachment(true);
        const uploaded = await uploadGoalAttachment(selectedFile);
        attachmentPayload = {
          attachmentUrl: uploaded?.attachmentUrl || null,
          attachmentName: uploaded?.attachmentName || null
        };
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        dueDate: form.dueDate || null,
        link: form.link.trim() || null,
        ...(editingGoal ? { ...attachmentPayload } : attachmentPayload)
      };

      if (editingGoal) {
        await updateGoal(editingGoal.id, payload);
        notifySuccess('Cập nhật mục tiêu thành công.');
      } else {
        await createGoal(payload);
        notifySuccess('Thêm mục tiêu thành công.');
      }

      resetForm();
      await loadGoals();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message || 'Không thể lưu mục tiêu.');
    } finally {
      setSubmitting(false);
      setUploadingAttachment(false);
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setForm({
      title: goal.title || '',
      description: goal.description || '',
      dueDate: goal.dueDate ? String(goal.dueDate).slice(0, 10) : '',
      link: goal.link || ''
    });
    setErrors({});
    setSelectedFile(null);
  };

  const handleReviewGoal = async (goalId, status) => {
    try {
      setActionLoading(true);
      await updateGoal(goalId, { status });
      notifySuccess(status === 'APPROVED' ? 'Mục tiêu đã được duyệt.' : 'Mục tiêu đã bị từ chối.');
      await loadGoals();
    } catch (err) {
      notifyError(err?.response?.data?.message || 'Không thể cập nhật trạng thái mục tiêu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetGoalStatus = async (goalId) => {
    try {
      setActionLoading(true);
      await updateGoal(goalId, { status: 'PENDING' });
      notifySuccess('Đã đặt lại mục tiêu về trạng thái chờ duyệt.');
      await loadGoals();
    } catch (err) {
      notifyError(err?.response?.data?.message || 'Không thể đặt lại trạng thái mục tiêu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeGoalStatus = async (goalId, status) => {
    try {
      setActionLoading(true);
      await updateGoal(goalId, { status });
      notifySuccess(status === 'IN_PROGRESS' ? 'Mục tiêu đã được chuyển sang đang thực hiện.' : 'Mục tiêu đã được đánh dấu hoàn thành.');
      await loadGoals();
    } catch (err) {
      notifyError(err?.response?.data?.message || 'Không thể cập nhật trạng thái mục tiêu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (goalId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mục tiêu này?')) return;

    try {
      setActionLoading(true);
      await deleteGoal(goalId);
      notifySuccess('Đã xóa mục tiêu.');
      await loadGoals();
    } catch (err) {
      notifyError(err?.response?.data?.message || 'Không thể xóa mục tiêu.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <section className="hero-panel">
        <div>
          <p className="hero-eyebrow">Mục tiêu thực tập</p>
          <h1>Theo dõi mục tiêu và tiến độ học tập</h1>
          <p className="hero-subtitle">Quản lý ngắn gọn các mục tiêu của kỳ thực tập, dễ theo dõi và thuận tiện cho mentor duyệt.</p>
        </div>
        <div className="hero-badges">
          <span className="hero-badge"><span className="hero-badge-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /></svg></span>Tập trung mục tiêu</span>
          <span className="hero-badge"><span className="hero-badge-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4 10-10" /></svg></span>Dễ theo dõi</span>
        </div>
      </section>

      {errors.api ? <div className="card error-card">{errors.api}</div> : null}

      <div className="overview-grid">
        <section className="card section-card">
          <h2><span className="section-title-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19h16" /><path d="M7 15v-4" /><path d="M12 15V7" /><path d="M17 15v-2" /></svg></span>Tổng quan mục tiêu</h2>
          <div className="goal-summary-grid">
            <div>
              <strong>Tổng mục tiêu</strong>
              <p>{summary.total}</p>
            </div>
            <div>
              <strong>Chờ duyệt</strong>
              <p>{summary.PENDING}</p>
            </div>
            <div>
              <strong>Đang thực hiện</strong>
              <p>{summary.IN_PROGRESS}</p>
            </div>
            <div>
              <strong>Hoàn thành</strong>
              <p>{summary.COMPLETED}</p>
            </div>
            <div>
              <strong>Tỉ lệ hoàn thành</strong>
              <p>{completionRate}%</p>
            </div>
          </div>
        </section>

        <section className="card section-card">
          <h2>{editingGoal ? <><span className="section-title-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></span>Chỉnh sửa mục tiêu</> : <><span className="section-title-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg></span>Thêm mục tiêu mới</>}</h2>
          <form onSubmit={handleSubmit} className="form-stack">
            <label>
              Tiêu đề <span className="field-required">*</span>
              <div className="form-field-wrapper">
                <input 
                  name="title" 
                  value={form.title} 
                  onChange={handleFieldChange} 
                  placeholder="Ví dụ: Hoàn thành module backend"
                  className={errors.title ? 'input-error' : ''}
                />
                <span className={`field-counter ${form.title.length > 100 ? 'warning' : ''} ${form.title.length > 120 ? 'error' : ''}`}>
                  {form.title.length}/120
                </span>
              </div>
              {errors.title ? <div className="field-error">{errors.title}</div> : null}
            </label>

            <label>
              Mô tả
              <div className="form-field-wrapper">
                <textarea 
                  name="description" 
                  value={form.description} 
                  onChange={handleFieldChange} 
                  rows={4} 
                  placeholder="Mô tả ngắn về mục tiêu của bạn"
                  className={errors.description ? 'input-error' : ''}
                />
                <span className={`field-counter ${form.description.length > 400 ? 'warning' : ''} ${form.description.length > 500 ? 'error' : ''}`}>
                  {form.description.length}/500
                </span>
              </div>
              {errors.description ? <div className="field-error">{errors.description}</div> : null}
            </label>

            <label>
              Hạn hoàn thành
              <input 
                type="date" 
                name="dueDate" 
                value={form.dueDate} 
                onChange={handleFieldChange}
                className={errors.dueDate ? 'input-error' : ''}
              />
              {errors.dueDate ? <div className="field-error">{errors.dueDate}</div> : null}
            </label>

            <label>
              Link tham khảo
              <input 
                name="link" 
                value={form.link} 
                onChange={handleFieldChange} 
                placeholder="https://example.com"
                className={errors.link ? 'input-error' : ''}
              />
              {errors.link ? <div className="field-error">{errors.link}</div> : null}
            </label>

            <label className="goal-upload-row">
              Tệp đính kèm (ảnh / file)
              <input type="file" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} />
              {selectedFile ? <span className="goal-file-name">✓ Đã chọn: {selectedFile.name}</span> : null}
              {uploadingAttachment ? <span className="goal-file-name">⏳ Đang tải tệp lên...</span> : null}
            </label>

            <div className="form-actions">
              <button 
                type="submit" 
                className="btn primary" 
                disabled={!formIsValid}
                title={!formIsValid ? 'Vui lòng điền đúng thông tin mục tiêu' : ''}
              >
                {submitting ? '⏳ Đang lưu...' : editingGoal ? '💾 Cập nhật mục tiêu' : '➕ Thêm mục tiêu'}
              </button>
              {editingGoal ? (
                <button type="button" className="btn outline" onClick={resetForm} disabled={submitting}>✕ Hủy</button>
              ) : null}
            </div>
          </form>
        </section>
      </div>

      {selectedAttachment ? (
        <div className="goal-modal-backdrop" onClick={() => setSelectedAttachment(null)}>
          <div className="goal-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="goal-modal-header">
              <h3>{selectedAttachment.attachmentName}</h3>
              <button className="btn outline small" type="button" onClick={() => setSelectedAttachment(null)}>Đóng</button>
            </div>
            {isImageAttachment(selectedAttachment.attachmentName) ? (
              <img className="goal-modal-image" src={selectedAttachment.attachmentUrl} alt={selectedAttachment.attachmentName} loading="lazy" decoding="async" />
            ) : (
              <div className="goal-modal-file">
                <p>File đính kèm</p>
                <a href={selectedAttachment.attachmentUrl} target="_blank" rel="noreferrer">Tải xuống</a>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <section className="card">
        <div className="card-header">
          <h2><span className="section-title-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M15 3v5h5" /></svg></span>Danh sách mục tiêu</h2>
          <span className="badge">{userRole === 'ENTERPRISE' ? 'Mentor xem và duyệt' : 'Sinh viên quản lý mục tiêu'}</span>
        </div>

        <div className="goal-filter-controls">
          <div className="goal-search-box">
            <input
              type="text"
              placeholder="Tìm kiếm mục tiêu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="goal-search-input"
            />
          </div>

          <div className="goal-filter-tabs">
            {['ALL', 'PENDING', 'IN_PROGRESS', 'APPROVED', 'COMPLETED'].map((status) => (
              <button
                key={status}
                className={`goal-filter-tab ${filterStatus === status ? 'active' : ''}`}
                onClick={() => setFilterStatus(status)}
              >
                {status === 'ALL' ? 'Tất cả' : status === 'PENDING' ? 'Chờ duyệt' : status === 'IN_PROGRESS' ? 'Đang làm' : status === 'APPROVED' ? 'Đã duyệt' : 'Hoàn thành'}
              </button>
            ))}
          </div>

          <div className="goal-sort-controls">
            <label>
              Sắp xếp:
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="goal-sort-select">
                <option value="created">Mới nhất</option>
                <option value="deadline">Hạn hoàn thành</option>
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <p className="empty-state">Đang tải mục tiêu...</p>
        ) : goals.length === 0 ? (
          <p className="empty-state">Chưa có mục tiêu nào. Hãy thêm mục tiêu đầu tiên để theo dõi tiến độ.</p>
        ) : filteredAndSortedGoals.length === 0 ? (
          <p className="empty-state">Không tìm thấy mục tiêu nào phù hợp với bộ lọc.</p>
        ) : (
          <div className="goal-list">
            {filteredAndSortedGoals.map((goal) => (
              <div key={goal.id} className={`goal-item status-${goal.status.toLowerCase()}`}>
                <div className="goal-header">
                  <div>
                    <strong>{goal.title}</strong>
                    <div className="goal-meta">
                      {goal.dueDate ? <span>Hạn: {formatDateVN(goal.dueDate)}</span> : null}
                      {goal.link ? <a href={goal.link} target="_blank" rel="noreferrer">Link tham khảo</a> : null}
                    </div>
                  </div>
                  <span className={`status-chip ${STATUS_CLASS[goal.status] || 'status-neutral'}`}>{STATUS_LABELS[goal.status] || goal.status}</span>
                </div>
                {goal.description ? <p>{goal.description}</p> : null}
                <div className="goal-progress-block">
                  <div className="goal-progress-meta">
                    <span>Tiến độ</span>
                    <strong>{goal.status === 'COMPLETED' ? '100%' : goal.status === 'APPROVED' ? '75%' : goal.status === 'IN_PROGRESS' ? '50%' : goal.status === 'REJECTED' ? '0%' : '25%'}</strong>
                  </div>
                  <div className="goal-progress-bar">
                    <div className="goal-progress-fill" style={{ width: `${goal.status === 'COMPLETED' ? '100%' : goal.status === 'APPROVED' ? '75%' : goal.status === 'IN_PROGRESS' ? '50%' : goal.status === 'REJECTED' ? '0%' : '25%'}` }} />
                  </div>
                  <div className="goal-progress-legend">
                    <span className="legend-chip pending">Chờ duyệt</span>
                    <span className="legend-chip active">Đang làm</span>
                    <span className="legend-chip done">Hoàn thành</span>
                  </div>
                </div>
                {goal.attachmentName && goal.attachmentUrl ? (
                  <div className="goal-attachment-preview">
                    {isImageAttachment(goal.attachmentName) ? (
                      <img src={goal.attachmentUrl} alt={goal.attachmentName} loading="lazy" decoding="async" />
                    ) : null}
                    <button className="btn outline small" type="button" onClick={() => setSelectedAttachment(goal)}>
                      Xem tệp đính kèm
                    </button>
                  </div>
                ) : null}
                <div className="goal-footer">
                  <div className="goal-actions">
                    {userRole !== 'ENTERPRISE' ? (
                      <>
                        {goal.status !== 'IN_PROGRESS' ? (
                          <button className="btn outline" type="button" onClick={() => handleChangeGoalStatus(goal.id, 'IN_PROGRESS')} disabled={actionLoading}>Bắt đầu</button>
                        ) : null}
                        {goal.status !== 'COMPLETED' ? (
                          <button className="btn primary" type="button" onClick={() => handleChangeGoalStatus(goal.id, 'COMPLETED')} disabled={actionLoading}>Hoàn thành</button>
                        ) : null}
                        <button className="btn outline" type="button" onClick={() => handleEdit(goal)} disabled={actionLoading}>Sửa</button>
                      </>
                    ) : null}
                    {userRole === 'ENTERPRISE' && ['PENDING', 'IN_PROGRESS'].includes(goal.status) ? (
                      <>
                        <button className="btn primary" type="button" onClick={() => handleReviewGoal(goal.id, 'APPROVED')} disabled={actionLoading}>Duyệt</button>
                        <button className="btn outline" type="button" onClick={() => handleReviewGoal(goal.id, 'REJECTED')} disabled={actionLoading}>Từ chối</button>
                      </>
                    ) : null}
                    {userRole === 'ENTERPRISE' && goal.status !== 'PENDING' ? (
                      <button className="btn outline" type="button" onClick={() => handleResetGoalStatus(goal.id)} disabled={actionLoading}>Đặt lại chờ duyệt</button>
                    ) : null}
                    <button className="btn outline" type="button" onClick={() => handleDelete(goal.id)} disabled={actionLoading}>Xóa</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default GoalsPage;
