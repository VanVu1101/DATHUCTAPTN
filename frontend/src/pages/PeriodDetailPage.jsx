import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../App.css';
import { getPeriodById, uploadPeriodDocument } from '../services/periodService';

const documentCategories = [
  'Quy định thực tập',
  'Biểu mẫu',
  'Nhật ký thực tập',
  'Phiếu đánh giá',
  'Hướng dẫn báo cáo',
];

function StatCard({ label, value, tone = 'neutral' }) {
  return (
    <div className={`stat-card period-stat ${tone}`}>
      <h3>{label}</h3>
      <p>{value}</p>
    </div>
  );
}

function PeriodDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [period, setPeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [uploadForm, setUploadForm] = useState({ title: '', category: documentCategories[0], file: null });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    setUser(stored ? JSON.parse(stored) : null);
  }, []);

  const loadPeriod = async () => {
    setLoading(true);
    try {
      const res = await getPeriodById(id);
      if (res?.success) {
        setPeriod(res.data);
        setSelectedStudent(res.data?.students?.[0] || null);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không tải được chi tiết kỳ thực tập.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeriod();
  }, [id]);

  const isAdmin = useMemo(() => user?.role === 'ADMIN', [user]);

  const handleUploadChange = (event) => {
    const { name, value, files } = event.target;
    setUploadForm((current) => ({
      ...current,
      [name]: name === 'file' ? files?.[0] || null : value,
    }));
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!uploadForm.file) {
      setMessage('Vui lòng chọn tệp tài liệu.');
      return;
    }

    setUploading(true);
    setMessage('');
    try {
      const payload = new FormData();
      payload.append('title', uploadForm.title);
      payload.append('category', uploadForm.category);
      payload.append('file', uploadForm.file);
      const res = await uploadPeriodDocument(id, payload);
      if (res?.success) {
        setMessage('Đã upload tài liệu kỳ thực tập.');
        setUploadForm({ title: '', category: documentCategories[0], file: null });
        await loadPeriod();
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không thể upload tài liệu.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="page-shell">Đang tải...</div>;
  if (!period) return <div className="page-shell">Không tìm thấy đợt thực tập</div>;

  return (
    <div className="page-shell period-detail-page">
      <section className="hero-card period-detail-hero">
        <div className="period-detail-header">
          <div>
            <div className="eyebrow">Chi tiết kỳ thực tập</div>
            <h1>{period.name}</h1>
            <p>{period.academicYear} · {period.description || 'Thông tin kỳ thực tập'}</p>
          </div>
          <div className="button-row">
            <button className="btn outline" type="button" onClick={() => navigate('/periods')}>Quay lại</button>
            <button className="btn" type="button" onClick={() => navigate('/reports')}>Tới báo cáo</button>
          </div>
        </div>

        <div className="period-summary-grid">
          <div>
            <div className="detail-label">Trạng thái</div>
            <div className={`status-chip ${period.computedStatus === 'ONGOING' ? 'status-done' : period.computedStatus === 'COMPLETED' ? 'status-pending' : ''}`}>
              {period.statusLabel}
            </div>
          </div>
          <div>
            <div className="detail-label">Ngày bắt đầu</div>
            <strong>{period.startDate}</strong>
          </div>
          <div>
            <div className="detail-label">Ngày kết thúc</div>
            <strong>{period.endDate}</strong>
          </div>
          <div>
            <div className="detail-label">Số ngày còn lại</div>
            <strong>{period.progress?.remainingDays || 0} ngày</strong>
          </div>
        </div>

        <div className="period-progress-card">
          <div className="period-progress-meta">
            <span>{period.progress?.passedDays || 0} / {period.progress?.totalDays || 0} ngày</span>
            <span>{period.progress?.percentComplete || 0}% hoàn thành</span>
          </div>
          <div className="progress-bar"><span style={{ width: `${period.progress?.percentComplete || 0}%` }} /></div>
        </div>

        {period.notifications?.length > 0 && (
          <div className="notification-list">
            {period.notifications.map((notification) => (
              <div className="notification-item" key={notification}>{notification}</div>
            ))}
          </div>
        )}
      </section>

      <section className="stats-grid period-stats-grid">
        <StatCard label="Tổng số sinh viên" value={period.stats?.totalStudents || 0} tone="neutral" />
        <StatCard label="Đang thực tập" value={period.stats?.ongoingStudents || 0} tone="green" />
        <StatCard label="Đã hoàn thành" value={period.stats?.completedStudents || 0} tone="blue" />
        <StatCard label="Doanh nghiệp tham gia" value={period.stats?.enterpriseCount || 0} tone="yellow" />
        <StatCard label="Mentor hướng dẫn" value={period.stats?.mentorCount || 0} tone="neutral" />
        <StatCard label="Báo cáo đã nộp" value={period.stats?.reportsSubmitted || 0} tone="green" />
        <StatCard label="Báo cáo chưa nộp" value={period.stats?.reportsMissing || 0} tone="red" />
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h3>Timeline kỳ thực tập</h3>
            <p>Các mốc chính được hiển thị theo tiến trình của kỳ.</p>
          </div>
        </div>
        <div className="timeline-list period-timeline">
          {period.timeline?.map((item) => (
            <div className="timeline-item" key={`${item.title}-${item.date}`}>
              <div className="timeline-marker" />
              <div className="timeline-content">
                <div className="timeline-row">
                  <strong>{item.title}</strong>
                  <span>{item.date}</span>
                </div>
                <p>{item.note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h3>Tài liệu kỳ thực tập</h3>
            <p>Admin upload, sinh viên tải xuống trực tiếp.</p>
          </div>
        </div>

        <div className="document-list">
          {period.documents?.length > 0 ? period.documents.map((document) => (
            <div className="document-item" key={document.id}>
              <div>
                <strong>{document.title}</strong>
                <p>{document.category}</p>
              </div>
              <a className="btn outline" href={`http://localhost:5000${document.fileUrl}`} target="_blank" rel="noreferrer">Tải xuống</a>
            </div>
          )) : <p>Chưa có tài liệu nào.</p>}
        </div>

        {isAdmin && (
          <form className="form-stack period-upload-form" onSubmit={handleUpload}>
            <h4>Upload tài liệu</h4>
            <input name="title" value={uploadForm.title} onChange={handleUploadChange} placeholder="Tên tài liệu" required />
            <select name="category" value={uploadForm.category} onChange={handleUploadChange}>
              {documentCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <input type="file" name="file" onChange={handleUploadChange} required />
            <button className="btn" type="submit" disabled={uploading}>{uploading ? 'Đang upload...' : 'Upload tài liệu'}</button>
          </form>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h3>Danh sách sinh viên thuộc kỳ</h3>
            <p>{period.students?.length || 0} sinh viên được phân công.</p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="simple-table period-student-table">
            <thead>
              <tr>
                <th>MSSV</th>
                <th>Họ tên</th>
                <th>Lớp</th>
                <th>Doanh nghiệp</th>
                <th>Mentor</th>
                <th>Trạng thái thực tập</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {period.students?.length > 0 ? period.students.map((student) => (
                <tr key={student.internshipId}>
                  <td>{student.studentCode}</td>
                  <td>{student.fullName}</td>
                  <td>{student.className || '—'}</td>
                  <td>{student.enterpriseName || '—'}</td>
                  <td>{student.mentorName || '—'}</td>
                  <td>{student.internshipStatus || '—'}</td>
                  <td>
                    <button className="btn outline" type="button" onClick={() => setSelectedStudent(student)}>Xem chi tiết</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7">Chưa có sinh viên trong kỳ này.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedStudent && (
          <div className="selected-student-card">
            <div className="card-header">
              <div>
                <h4>Chi tiết sinh viên</h4>
                <p>{selectedStudent.studentCode} · {selectedStudent.fullName}</p>
              </div>
              <button className="btn outline" type="button" onClick={() => setSelectedStudent(null)}>Đóng</button>
            </div>
            <div className="detail-grid-mini">
              <div><span>Lớp</span><strong>{selectedStudent.className || '—'}</strong></div>
              <div><span>Doanh nghiệp</span><strong>{selectedStudent.enterpriseName || '—'}</strong></div>
              <div><span>Mentor</span><strong>{selectedStudent.mentorName || '—'}</strong></div>
              <div><span>Trạng thái</span><strong>{selectedStudent.internshipStatus || '—'}</strong></div>
            </div>
          </div>
        )}
      </section>

      {message && <div className="info-card"><p>{message}</p></div>}
    </div>
  );
}

export default PeriodDetailPage;