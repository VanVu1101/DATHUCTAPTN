import '../App.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyTasks, getAllTasks, createTask, updateTask, deleteTask, submitTask, addTaskComment, saveMentorNote } from '../services/taskService';
import { getStudents } from '../services/studentService';
import StudentAutocomplete from '../components/StudentAutocomplete';
import { getAllPeriods } from '../services/periodService';
import PageHeader from '../components/PageHeader';
import { notifyError, notifySuccess } from '../utils/toast';

const BACKEND_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

const statusOptions = [
  { value: 'TODO', label: 'Chờ giao' },
  { value: 'IN_PROGRESS', label: 'Đang làm' },
  { value: 'REVIEW', label: 'Đã nộp' },
  { value: 'DONE', label: 'Hoàn thành' }
];

const priorityOptions = [
  { value: 'LOW', label: 'Thấp' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'HIGH', label: 'Cao' }
];

const statusMetaMap = {
  TODO: { label: 'Chờ giao', icon: '⏳', className: 'status-todo' },
  IN_PROGRESS: { label: 'Đang làm', icon: '⚙️', className: 'status-in-progress' },
  REVIEW: { label: 'Đã nộp', icon: '📤', className: 'status-review' },
  DONE: { label: 'Hoàn thành', icon: '✓', className: 'status-done' }
};

const priorityMetaMap = {
  LOW: { label: 'Thấp', icon: '↓', className: 'priority-low' },
  MEDIUM: { label: 'Trung bình', icon: '↔', className: 'priority-medium' },
  HIGH: { label: 'Cao', icon: '↑', className: 'priority-high' }
};

const tabOptions = [
  { key: '', label: 'Tất cả', value: '' },
  { key: 'IN_PROGRESS', label: 'Đang làm', value: 'IN_PROGRESS' },
  { key: 'TODO', label: 'Chưa làm', value: 'TODO' },
  { key: 'DONE', label: 'Hoàn thành', value: 'DONE' }
];

const initialForm = {
  title: '',
  description: '',
  deadline: '',
  assignedAt: '',
  category: '',
  taskCode: '',
  priority: 'MEDIUM',
  studentId: '',
  status: 'TODO'
};

function TasksPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [students, setStudents] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editTask, setEditTask] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [submissionComment, setSubmissionComment] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTaskStatus, setSelectedTaskStatus] = useState('TODO');
  const [submitModalTask, setSubmitModalTask] = useState(null);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [mentorNoteDraft, setMentorNoteDraft] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [savingMentorNote, setSavingMentorNote] = useState(false);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem('user');
      const parsed = stored ? JSON.parse(stored) : null;
      setUser(parsed);
      setIsAdmin(parsed?.role === 'ADMIN');

      const studentsPromise = parsed?.role === 'ADMIN' ? getStudents() : Promise.resolve([]);
      const [studentsResponse, periodsResponse] = await Promise.all([
        studentsPromise,
        getAllPeriods()
      ]);

      const normalizeArray = (resp) => {
        if (Array.isArray(resp)) return resp;
        if (resp && Array.isArray(resp.data)) return resp.data;
        return [];
      };

      // If API returned an error object like { success: false, message: '...' }
      const checkAuthError = (resp) => {
        if (resp && resp.success === false && typeof resp.message === 'string') {
          if (resp.message.toLowerCase().includes('token') || resp.message.toLowerCase().includes('từ chối')) {
            setMessage(resp.message);
            navigate('/login');
            return true;
          }
        }
        return false;
      };

      if (checkAuthError(studentsResponse) || checkAuthError(periodsResponse)) return;

      setStudents(normalizeArray(studentsResponse));
      setPeriods(normalizeArray(periodsResponse));

      const taskResponse = parsed?.role === 'ADMIN'
        ? await getAllTasks({ periodId: filterPeriod || undefined, status: filterStatus || undefined, studentId: filterStudent || undefined })
        : await getMyTasks(filterPeriod || undefined, filterStatus || undefined);

      if (checkAuthError(taskResponse)) return;
      setTasks(normalizeArray(taskResponse));
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không tải được dữ liệu nhiệm vụ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [filterPeriod, filterStatus]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleFileChange = (e) => {
    setUploadFile(e.target.files?.[0] || null);
  };

  const handleEdit = (task) => {
    setEditTask(task);
    setForm({
      title: task.title || '',
      description: task.description || '',
      deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : '',
      assignedAt: task.assignedAt ? new Date(task.assignedAt).toISOString().slice(0, 10) : '',
      category: task.category || '',
      taskCode: task.taskCode || '',
      priority: task.priority || 'MEDIUM',
      studentId: task.studentId || '',
      status: task.status || 'TODO'
    });
  };

  const handleStudentSelect = (student) => {
    setForm((c) => ({ ...c, studentId: student ? String(student.id) : '' }));
  };

  const resetForm = () => {
    setEditTask(null);
    setForm(initialForm);
    setMessage('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const payload = {
        title: form.title,
        description: form.description,
        deadline: form.deadline || null,
        assignedAt: form.assignedAt || null,
        category: form.category || null,
        taskCode: form.taskCode || null,
        priority: form.priority || 'MEDIUM',
        studentId: form.studentId || undefined,
        status: isAdmin ? form.status : undefined
      };
      if (editTask) {
        await updateTask(editTask.id, payload);
        setMessage('Cập nhật nhiệm vụ thành công');
        notifySuccess('Cập nhật nhiệm vụ thành công');
      } else {
        await createTask(payload);
        setMessage('Tạo nhiệm vụ thành công');
        notifySuccess('Tạo nhiệm vụ thành công');
      }
      resetForm();
      loadInitialData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Lỗi khi lưu nhiệm vụ');
      notifyError(error.response?.data?.message || 'Lỗi khi lưu nhiệm vụ');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa nhiệm vụ này?')) return;
    try {
      await deleteTask(id);
      setMessage('Đã xóa nhiệm vụ');
      notifySuccess('Đã xóa nhiệm vụ');
      loadInitialData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Xóa nhiệm vụ thất bại');
      notifyError(error.response?.data?.message || 'Xóa nhiệm vụ thất bại');
    }
  };

  const handleSubmit = (task) => {
    if (!task) return;
    setSubmitModalTask(task);
    setSubmissionComment('');
    setUploadFile(null);
  };

  const closeSubmitModal = () => {
    setSubmitModalTask(null);
    setUploadFile(null);
    setSubmissionComment('');
  };

  const handleSubmitConfirm = async (e) => {
    e?.preventDefault();
    if (!submitModalTask) return;
    if (!uploadFile && !submissionComment.trim()) {
      setMessage('Vui lòng thêm file hoặc ghi chú nộp.');
      return;
    }

    try {
      setSubmittingTask(true);
      const result = await submitTask(submitModalTask.id, {
        status: 'REVIEW',
        comment: submissionComment,
        file: uploadFile
      });
      const successMessage = `Nộp bài thành công${result?.fileName ? `: ${result.fileName}` : ''}`;
      setMessage(successMessage);
      notifySuccess(successMessage);
      closeSubmitModal();
      loadInitialData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Nộp nhiệm vụ thất bại');
      notifyError(error.response?.data?.message || 'Nộp nhiệm vụ thất bại');
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleOpenTaskDetails = (task) => {
    setSelectedTask(task);
    setSelectedTaskStatus(task.status || 'TODO');
    setCommentDraft('');
    setMentorNoteDraft(task.mentorNote || '');
  };

  const handleCloseTaskDetails = () => {
    setSelectedTask(null);
    setSelectedTaskStatus('TODO');
    setCommentDraft('');
    setMentorNoteDraft('');
  };

  const handleStatusSave = async () => {
    if (!selectedTask || selectedTaskStatus === selectedTask.status) return;
    try {
      await updateTask(selectedTask.id, { status: selectedTaskStatus });
      setMessage('Cập nhật trạng thái nhiệm vụ thành công');
      notifySuccess('Cập nhật trạng thái nhiệm vụ thành công');
      loadInitialData();
      handleCloseTaskDetails();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Cập nhật trạng thái thất bại');
      notifyError(error.response?.data?.message || 'Cập nhật trạng thái thất bại');
    }
  };

  const handleCommentSave = async (e) => {
    e?.preventDefault();
    if (!selectedTask || !commentDraft.trim()) return;

    try {
      setSavingComment(true);
      const refreshed = await addTaskComment(selectedTask.id, commentDraft.trim());
      setSelectedTask(refreshed);
      setCommentDraft('');
      setMessage('Đã thêm bình luận');
      notifySuccess('Đã thêm bình luận');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không thể thêm bình luận');
      notifyError(error.response?.data?.message || 'Không thể thêm bình luận');
    } finally {
      setSavingComment(false);
    }
  };

  const handleMentorNoteSave = async (e) => {
    e?.preventDefault();
    if (!selectedTask) return;

    try {
      setSavingMentorNote(true);
      const refreshed = await saveMentorNote(selectedTask.id, mentorNoteDraft.trim());
      setSelectedTask(refreshed);
      setMentorNoteDraft(refreshed?.mentorNote || '');
      setMessage('Đã lưu ghi chú mentor');
      notifySuccess('Đã lưu ghi chú mentor');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không thể lưu ghi chú mentor');
      notifyError(error.response?.data?.message || 'Không thể lưu ghi chú mentor');
    } finally {
      setSavingMentorNote(false);
    }
  };

  const getStudentName = (studentId) => {
    const student = students.find((item) => item.id === studentId);
    return student ? student.fullName : studentId;
  };

  const getStatusMeta = (status) => {
    return statusMetaMap[status] || { label: status || 'Chờ giao', icon: '•', className: 'status-neutral' };
  };

  const getStatusClass = (status) => {
    return getStatusMeta(status).className;
  };

  const getPriorityMeta = (priority) => {
    return priorityMetaMap[priority] || { label: priority || 'Trung bình', icon: '•', className: 'priority-medium' };
  };

  const getPriorityLabel = (priority) => {
    return getPriorityMeta(priority).label;
  };

  const getTaskTags = (task) => {
    const tags = [];
    if (task.taskCode) {
      tags.push(task.taskCode);
    }
    if (task.category) {
      tags.push(task.category);
    }
    if (task.priority) {
      tags.push(`Ưu tiên: ${priorityOptions.find((p) => p.value === task.priority)?.label || task.priority}`);
    }
    if (task.Internship?.InternshipPeriod?.name) {
      tags.push(task.Internship.InternshipPeriod.name);
    }
    if (task.fileUrl) {
      tags.push('Có file');
    }
    if (task.submissionComment) {
      tags.push('Ghi chú');
    }
    return tags;
  };

  const openTaskDetails = handleOpenTaskDetails;
  const closeTaskDetails = handleCloseTaskDetails;

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesStatus = filterStatus ? task.status === filterStatus : true;
      const matchesSearch = normalizedSearch
        ? [task.title, task.description, task.fileName, task.submissionComment]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedSearch))
        : true;
      return matchesStatus && matchesSearch;
    });
  }, [tasks, filterStatus, searchTerm]);

  const taskCounts = useMemo(() => {
    return {
      all: tasks.length,
      todo: tasks.filter((task) => task.status === 'TODO').length,
      inProgress: tasks.filter((task) => task.status === 'IN_PROGRESS').length,
      review: tasks.filter((task) => task.status === 'REVIEW').length,
      done: tasks.filter((task) => task.status === 'DONE').length
    };
  }, [tasks]);

  const tasksByStatus = useMemo(() => {
    const todo = filteredTasks.filter((task) => task.status === 'TODO');
    const inProgress = filteredTasks.filter((task) => task.status === 'IN_PROGRESS');
    const review = filteredTasks.filter((task) => task.status === 'REVIEW');
    const done = filteredTasks.filter((task) => task.status === 'DONE');
    return { todo, inProgress, review, done };
  }, [filteredTasks]);

  const selectedTaskComments = Array.isArray(selectedTask?.comments) ? selectedTask.comments : [];
  const selectedTaskActivity = Array.isArray(selectedTask?.activityLog) ? selectedTask.activityLog : [];

  return (
    <div className="page-shell tasks-page">
      <PageHeader
        title="Quản lý nhiệm vụ"
        description={isAdmin ? 'Admin có thể tạo, sửa, xóa nhiệm vụ cho sinh viên.' : 'Theo dõi các nhiệm vụ và trạng thái nộp của bạn.'}
      />
      <div className="task-header card">
        <div>
          <h1>Quản lý nhiệm vụ</h1>
          <p>{isAdmin ? 'Admin có thể tạo, sửa, xóa nhiệm vụ. Sinh viên xem và nộp nhiệm vụ.' : 'Danh sách nhiệm vụ của bạn.'}</p>
        </div>
        <button className="btn" type="button" onClick={() => navigate('/')}>Quay lại</button>
      </div>

      {message && <div className="info-card"><p>{message}</p></div>}

      <section className="card">
        <div className="task-filter-row">
          <div className="task-filter-tabs">
            {tabOptions.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`tab-button ${filterStatus === tab.value ? 'active' : ''}`}
                onClick={() => setFilterStatus(tab.value)}
              >
                {tab.label}
                <span className="tab-count">{tab.value === '' ? taskCounts.all : tab.value === 'TODO' ? taskCounts.todo : tab.value === 'IN_PROGRESS' ? taskCounts.inProgress : tab.value === 'DONE' ? taskCounts.done : taskCounts.review}</span>
              </button>
            ))}
          </div>
          <div className="field-row">
            <label className="profile-field">
              <span>Tìm kiếm nhiệm vụ</span>
              <input
                type="search"
                className="task-search-input"
                placeholder="Nhập tiêu đề, mô tả, file..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </label>
            <label className="profile-field">
              <span>Lọc theo kỳ</span>
              <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
                <option value="">Tất cả</option>
                {Array.isArray(periods) ? periods.map((period) => (
                  <option key={period.id} value={period.id}>{period.name}</option>
                )) : null}
              </select>
            </label>
            {isAdmin && (
              <label className="profile-field">
                <span>Chọn sinh viên (gõ để tìm)</span>
                <StudentAutocomplete value={students.find(s=>String(s.id)===String(form.studentId)) || null} onChange={handleStudentSelect} />
              </label>
            )}
            {isAdmin && (
              <label className="profile-field">
                <span>Lọc theo sinh viên</span>
                <select value={filterStudent} onChange={(e) => setFilterStudent(e.target.value)}>
                  <option value="">Tất cả</option>
                  {Array.isArray(students) ? students.map((s) => (
                    <option key={s.id} value={s.id}>{s.fullName || s.studentCode}</option>
                  )) : null}
                </select>
              </label>
            )}
          </div>
        </div>
      </section>

      <section className="card tasks-layout-card">
        <div className="tasks-layout-grid">
          <div className="tasks-list-panel">
            <div className="task-board-header">
              <div>
                <h3>Nhiệm vụ được giao</h3>
                <p className="task-board-summary">Tổng {taskCounts.all} nhiệm vụ • Chưa làm {taskCounts.todo} • Đang làm {taskCounts.inProgress} • Đã nộp {taskCounts.review} • Hoàn thành {taskCounts.done}</p>
              </div>
              <button className="btn outline" type="button" onClick={() => setSearchTerm('')}>Xóa tìm kiếm</button>
            </div>
            <div className="task-board-list">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`task-card task-list-item task-card-clickable ${getStatusClass(task.status)}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => openTaskDetails(task)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openTaskDetails(task);
                    }
                  }}
                >
                  <div className="task-card-main">
                    <div className="task-card-info">
                      <div className="task-card-badge">
                        <span className={task.status === 'TODO' ? 'dot gray' : task.status === 'IN_PROGRESS' ? 'dot blue' : task.status === 'REVIEW' ? 'dot orange' : 'dot green'} />
                        <div className="task-card-body-copy">
                          <div className="task-card-title-row">
                            <h5>{task.title}</h5>
                            <span className="task-card-arrow">→</span>
                          </div>
                          <p>{task.description || 'Không có mô tả nhiệm vụ'}</p>
                        </div>
                      </div>
                      <div className="task-meta-row">
                        <span className="task-meta-chip">Giao: {task.assignedAt ? new Date(task.assignedAt).toLocaleDateString('vi-VN') : '—'}</span>
                        <span className="task-meta-chip">Hạn: {task.deadline ? new Date(task.deadline).toLocaleDateString('vi-VN') : '—'}</span>
                        <span className="task-meta-chip">SV: {getStudentName(task.studentId)}</span>
                        {task.Internship?.InternshipPeriod && <span className="task-meta-chip">Kỳ: {task.Internship.InternshipPeriod.name}</span>}
                      </div>
                    </div>
                    <div className="task-card-actions">
                      <span className={`status-chip ${getStatusClass(task.status)}`}>
                        <span className="status-icon">{getStatusMeta(task.status).icon}</span>
                        {getStatusMeta(task.status).label}
                      </span>
                      <div className="task-actions-row">
                        {isAdmin ? (
                          <>
                            <button className="btn outline small" type="button" onClick={(e) => { e.stopPropagation(); openTaskDetails(task); }}>Chi tiết</button>
                            <button className="btn outline small" type="button" onClick={(e) => { e.stopPropagation(); handleEdit(task); }}>Sửa</button>
                            <button className="btn outline danger small" type="button" onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}>Xóa</button>
                          </>
                        ) : task.status !== 'REVIEW' && task.status !== 'DONE' ? (
                          <button className="btn" type="button" onClick={(e) => { e.stopPropagation(); handleSubmit(task); }}>Nộp</button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="task-card-tags">
                    <span className={`task-priority-pill ${getPriorityMeta(task.priority).className}`}>
                      <span className="task-priority-icon">{getPriorityMeta(task.priority).icon}</span>
                      {getPriorityMeta(task.priority).label}
                    </span>
                    {getTaskTags(task).map((tag) => (
                      <span key={tag} className="task-tag">{tag}</span>
                    ))}
                  </div>
                  <div className="task-card-extra">
                    <span>{task.fileUrl ? <a href={`${BACKEND_URL}${task.fileUrl}`} target="_blank" rel="noreferrer">{task.fileName || 'Xem file'}</a> : 'Chưa có file'}</span>
                    {task.submissionComment && <span>Ghi chú: {task.submissionComment}</span>}
                    {task.submittedAt && <span>Nộp: {new Date(task.submittedAt).toLocaleString('vi-VN')}</span>}
                  </div>
                </div>
              ))}
              {!filteredTasks.length && <p className="empty-note">Không tìm thấy nhiệm vụ phù hợp.</p>}
            </div>
          </div>
          <div className="tasks-sidebar-panel">
            {!isAdmin ? (
              <section className="card submission-card">
                <h3>Nộp nhiệm vụ</h3>
                <p className="subtle-text">Bạn có thể mở chi tiết bất kỳ nhiệm vụ nào rồi bấm “Nộp nhiệm vụ này” ở trong popup.</p>
              </section>
            ) : (
              <section className="card submission-card">
                <h3>Nộp nhiệm vụ</h3>
                <p className="subtle-text">Chỉ sinh viên được phép nộp file cho nhiệm vụ.</p>
              </section>
            )}
            {isAdmin && (
              <section className="card task-form-card sidebar-card">
                <div className="sidebar-card-header">
                  <h3>{editTask ? 'Sửa nhiệm vụ' : 'Tạo nhiệm vụ mới'}</h3>
                  <span className="sidebar-card-pill">Metadata</span>
                </div>
                <form className="form-stack" onSubmit={handleSave}>
                  <label className="profile-field">
                    <span>Tiêu đề</span>
                    <input name="title" value={form.title} onChange={handleChange} required />
                  </label>
                  <label className="profile-field">
                    <span>Mô tả</span>
                    <textarea name="description" value={form.description} onChange={handleChange} rows={4} />
                  </label>
                  <div className="form-grid-two">
                    <label className="profile-field">
                      <span>Ngày giao</span>
                      <input type="date" name="assignedAt" value={form.assignedAt} onChange={handleChange} />
                    </label>
                    <label className="profile-field">
                      <span>Deadline</span>
                      <input type="date" name="deadline" value={form.deadline} onChange={handleChange} />
                    </label>
                  </div>
                  <div className="form-grid-two">
                    <label className="profile-field">
                      <span>Danh mục</span>
                      <input name="category" value={form.category} onChange={handleChange} placeholder="Ví dụ: Backend" />
                    </label>
                    <label className="profile-field">
                      <span>Mã nhiệm vụ</span>
                      <input name="taskCode" value={form.taskCode} onChange={handleChange} placeholder="Ví dụ: TASK-101" />
                    </label>
                  </div>
                  <div className="form-grid-two">
                    <label className="profile-field">
                      <span>Ưu tiên</span>
                      <select name="priority" value={form.priority} onChange={handleChange}>
                        {priorityOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="profile-field">
                      <span>Trạng thái</span>
                      <select name="status" value={form.status} onChange={handleChange}>
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="profile-field">
                    <span>Student</span>
                    <select name="studentId" value={form.studentId} onChange={handleChange} required>
                      <option value="">Chọn sinh viên</option>
                      {Array.isArray(students) ? students.map((student) => (
                        <option key={student.id} value={student.id}>{student.fullName} ({student.studentCode})</option>
                      )) : null}
                    </select>
                  </label>
                  <div className="button-row">
                    <button className="btn" type="submit">{editTask ? 'Cập nhật' : 'Tạo nhiệm vụ'}</button>
                    <button className="btn outline" type="button" onClick={resetForm}>Hủy</button>
                  </div>
                </form>
              </section>
            )}
          </div>
        </div>
      </section>

      {submitModalTask && (
        <div className="modal-backdrop" onClick={closeSubmitModal}>
          <div className="modal compact-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Nộp nhiệm vụ nhanh</h2>
                <p className="modal-note">{submitModalTask.title}</p>
              </div>
              <button className="modal-close" type="button" onClick={closeSubmitModal}>×</button>
            </div>
            <form className="form-stack" onSubmit={handleSubmitConfirm}>
              <label className="profile-field">
                <span>Ghi chú</span>
                <textarea value={submissionComment} onChange={(e) => setSubmissionComment(e.target.value)} rows={3} placeholder="Nhập ghi chú khi nộp" />
              </label>
              <label className="profile-field">
                <span>Đính kèm file</span>
                <input type="file" onChange={handleFileChange} />
                {uploadFile && <small>{uploadFile.name}</small>}
              </label>
              <div className="button-row">
                <button className="btn" type="submit" disabled={submittingTask}>{submittingTask ? 'Đang nộp...' : 'Xác nhận nộp'}</button>
                <button className="btn outline" type="button" onClick={closeSubmitModal}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTask && (
        <div className="modal-backdrop" onClick={closeTaskDetails}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Chi tiết nhiệm vụ</h2>
                <p className="modal-note">Task ID #{selectedTask.id}</p>
              </div>
              <button className="modal-close" type="button" onClick={closeTaskDetails}>×</button>
            </div>

            <div className="event-box">
              <div className="task-modal-top-row">
                <div className="task-modal-hero">
                  <div className="task-modal-hero-content">
                    <span className="task-modal-eyebrow">Chi tiết nhiệm vụ</span>
                    <h3>{selectedTask.title}</h3>
                    <p className="task-modal-subtitle">{selectedTask.description || 'Không có mô tả nhiệm vụ'}</p>
                  </div>
                  <div className="task-modal-badges">
                    <span className={`status-chip ${getStatusClass(selectedTask.status)}`}>
                      <span className="status-icon">{getStatusMeta(selectedTask.status).icon}</span>
                      {getStatusMeta(selectedTask.status).label}
                    </span>
                    <span className={`task-priority-pill ${getPriorityMeta(selectedTask.priority).className}`}>
                      <span className="task-priority-icon">{getPriorityMeta(selectedTask.priority).icon}</span>
                      {getPriorityMeta(selectedTask.priority).label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="info-box-grid">
                <div className="info-box">
                  <span className="info-box-label">📅 Ngày giao</span>
                  <strong>{selectedTask.assignedAt ? new Date(selectedTask.assignedAt).toLocaleDateString('vi-VN') : '—'}</strong>
                </div>
                <div className="info-box">
                  <span className="info-box-label">⏰ Hạn hoàn thành</span>
                  <strong>{selectedTask.deadline ? new Date(selectedTask.deadline).toLocaleDateString('vi-VN') : '—'}</strong>
                </div>
                <div className="info-box">
                  <span className="info-box-label">🎯 Mức độ ưu tiên</span>
                  <strong>{getPriorityLabel(selectedTask.priority)}</strong>
                </div>
                <div className="info-box">
                  <span className="info-box-label">🗂️ Danh mục</span>
                  <strong>{selectedTask.category || '—'}</strong>
                </div>
              </div>

              <div className="task-modal-meta">
                <div className="task-modal-detail-card">
                  <p><strong>👤 Sinh viên:</strong> {getStudentName(selectedTask.studentId)}</p>
                  <p><strong>🔢 Mã nhiệm vụ:</strong> {selectedTask.taskCode || '—'}</p>
                  {selectedTask.submissionComment && <p><strong>📝 Ghi chú nộp:</strong> {selectedTask.submissionComment}</p>}
                  {selectedTask.submittedAt && <p><strong>🕒 Thời gian nộp:</strong> {new Date(selectedTask.submittedAt).toLocaleString('vi-VN')}</p>}
                  {selectedTask.fileUrl ? (
                    <p><strong>📎 File nộp:</strong> <a href={`${BACKEND_URL}${selectedTask.fileUrl}`} target="_blank" rel="noreferrer">{selectedTask.fileName || 'Xem file'}</a></p>
                  ) : (
                    <p><strong>📎 File nộp:</strong> Chưa có</p>
                  )}
                </div>
              </div>

              <div className="task-detail-collab-grid">
                <section className="task-detail-panel">
                  <div className="task-detail-panel-header">
                    <h4>Bình luận</h4>
                    <span>{selectedTaskComments.length} phản hồi</span>
                  </div>
                  <form className="task-inline-form" onSubmit={handleCommentSave}>
                    <textarea value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} rows={3} placeholder="Ghi nhận cập nhật hoặc trao đổi với mentor..." />
                    <button className="btn" type="submit" disabled={savingComment || !commentDraft.trim()}>{savingComment ? 'Đang lưu...' : 'Gửi bình luận'}</button>
                  </form>
                  <div className="task-detail-list">
                    {selectedTaskComments.length ? selectedTaskComments.map((item) => (
                      <div key={item.id || `${item.createdAt}-${item.authorId}`} className="task-detail-item">
                        <div className="task-detail-item-top">
                          <strong>{item.authorRole || 'STUDENT'}</strong>
                          <span>{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '—'}</span>
                        </div>
                        <p>{item.content}</p>
                      </div>
                    )) : <p className="empty-note">Chưa có bình luận nào.</p>}
                  </div>
                </section>

                <section className="task-detail-panel">
                  <div className="task-detail-panel-header">
                    <h4>Lịch sử hoạt động</h4>
                    <span>{selectedTaskActivity.length} mục</span>
                  </div>
                  <div className="task-detail-list">
                    {selectedTaskActivity.length ? selectedTaskActivity.map((item) => (
                      <div key={item.id || `${item.createdAt}-${item.action}`} className="task-detail-item">
                        <div className="task-detail-item-top">
                          <strong>{item.action}</strong>
                          <span>{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '—'}</span>
                        </div>
                        <p>{item.details?.content || item.details?.comment || item.details?.title || 'Không có chi tiết'}</p>
                      </div>
                    )) : <p className="empty-note">Chưa có hoạt động nào.</p>}
                  </div>
                </section>
              </div>

              {(isAdmin || user?.role === 'MENTOR') && (
                <section className="task-detail-panel mentor-note-panel">
                  <div className="task-detail-panel-header">
                    <h4>Ghi chú mentor</h4>
                    <span>Nhắn lại cho sinh viên</span>
                  </div>
                  <form className="task-inline-form" onSubmit={handleMentorNoteSave}>
                    <textarea value={mentorNoteDraft} onChange={(e) => setMentorNoteDraft(e.target.value)} rows={4} placeholder="Nhập ghi chú hướng dẫn hoặc đánh giá ngắn..." />
                    <button className="btn" type="submit" disabled={savingMentorNote}>{savingMentorNote ? 'Đang lưu...' : 'Lưu ghi chú'}</button>
                  </form>
                  {selectedTask.mentorNote && <p className="mentor-note-preview">{selectedTask.mentorNote}</p>}
                </section>
              )}

              {!isAdmin && (
                <div className="modal-actions task-modal-actions">
                  <button className="btn" type="button" onClick={() => handleSubmit(selectedTask)}>Nộp nhiệm vụ này</button>
                </div>
              )}

              {isAdmin && (
                <div className="modal-actions task-modal-actions">
                  <label className="profile-field task-status-field">
                    <span>Trạng thái</span>
                    <select value={selectedTaskStatus} onChange={(e) => setSelectedTaskStatus(e.target.value)}>
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <button className="btn" type="button" onClick={handleStatusSave}>Cập nhật trạng thái</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TasksPage;
