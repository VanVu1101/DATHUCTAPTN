import '../App.css';
import { useEffect, useMemo, useState } from 'react';
import { getStudents, createStudent, updateStudent, deleteStudent } from '../services/studentService';
import { getAllPeriods } from '../services/periodService';

const initialForm = {
  studentCode: '',
  fullName: '',
  className: '',
  majorName: '',
  enterpriseName: '',
  mentorName: '',
  periodId: '',
  status: 'ACTIVE'
};

const statusOptions = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'ACTIVE', label: 'Đang thực tập' },
  { value: 'INACTIVE', label: 'Tạm dừng' },
  { value: 'COMPLETED', label: 'Hoàn thành' }
];

function StudentManagementPage() {
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingStudent, setEditingStudent] = useState(null);

  const isAdmin = useMemo(() => user?.role === 'ADMIN', [user]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    setUser(stored ? JSON.parse(stored) : null);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin, filterStatus, filterPeriod, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [studentsRes, periodsRes] = await Promise.all([
        getStudents({
          status: filterStatus === 'ALL' ? undefined : filterStatus,
          periodId: filterPeriod || undefined,
          search: search || undefined
        }),
        getAllPeriods()
      ]);

      setStudents(Array.isArray(studentsRes) ? studentsRes : studentsRes.data || []);
      setPeriods(Array.isArray(periodsRes) ? periodsRes : periodsRes.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không tải được danh sách sinh viên.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingStudent(null);
    setForm(initialForm);
    setIsFormOpen(true);
    setMessage('');
  };

  const openEditForm = (student) => {
    setEditingStudent(student);
    setForm({
      studentCode: student.studentCode || '',
      fullName: student.fullName || '',
      className: student.className || '',
      majorName: student.majorName || '',
      enterpriseName: student.enterpriseName || '',
      mentorName: student.mentorName || '',
      periodId: student.periodId ? String(student.periodId) : '',
      status: student.status || 'ACTIVE'
    });
    setIsFormOpen(true);
    setMessage('');
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingStudent(null);
    setForm(initialForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      const payload = {
        studentCode: form.studentCode,
        fullName: form.fullName,
        className: form.className,
        majorName: form.majorName,
        enterpriseName: form.enterpriseName,
        mentorName: form.mentorName,
        periodId: form.periodId ? Number(form.periodId) : null,
        status: form.status
      };

      if (editingStudent) {
        await updateStudent(editingStudent.id, payload);
        setMessage('Đã cập nhật sinh viên.');
      } else {
        await createStudent(payload);
        setMessage('Đã tạo sinh viên mới.');
      }

      closeForm();
      loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Lỗi khi lưu sinh viên.');
    }
  };

  const handleDelete = async (studentId) => {
    if (!window.confirm('Bạn có chắc muốn xóa sinh viên này?')) return;
    try {
      await deleteStudent(studentId);
      setMessage('Đã xóa sinh viên.');
      loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Xóa sinh viên thất bại.');
    }
  };

  if (!user) {
    return <div className="page-shell"><p>Đang kiểm tra quyền truy cập...</p></div>;
  }

  if (!isAdmin) {
    return (
      <div className="page-shell">
        <div className="card">
          <h1>Quản lý sinh viên</h1>
          <p>Bạn không có quyền truy cập trang này.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <section className="hero-card">
        <div className="card-header">
          <div>
            <h1>Quản lý sinh viên thực tập</h1>
            <p>Danh sách, tìm kiếm, lọc theo kỳ và trạng thái sinh viên.</p>
          </div>
          <button className="btn primary" type="button" onClick={openCreateForm}>Thêm sinh viên</button>
        </div>
      </section>

      {message && <div className="info-card"><p>{message}</p></div>}

      <section className="card">
        <div className="report-filters student-filters">
          <input
            type="text"
            placeholder="Tìm tên, mã, lớp, chuyên ngành hoặc doanh nghiệp"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            {statusOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
            <option value="">Tất cả kỳ</option>
            {periods.map((period) => (
              <option key={period.id} value={period.id}>{period.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p>Đang tải...</p>
        ) : (
          <div className="table-wrapper">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Mã SV</th>
                  <th>Họ tên</th>
                  <th>Lớp</th>
                  <th>Chuyên ngành</th>
                  <th>Doanh nghiệp</th>
                  <th>Mentor</th>
                  <th>Kỳ</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="9">Chưa có sinh viên nào.</td>
                  </tr>
                ) : students.map((student) => (
                  <tr key={student.id}>
                    <td>{student.studentCode || '—'}</td>
                    <td>{student.fullName || '—'}</td>
                    <td>{student.className || '—'}</td>
                    <td>{student.majorName || student.Major?.name || '—'}</td>
                    <td>{student.enterpriseName || '—'}</td>
                    <td>{student.mentorName || student.Mentor?.fullName || '—'}</td>
                    <td>{student.InternshipPeriod?.name || '—'}</td>
                    <td>{student.status || '—'}</td>
                    <td>
                      <div className="button-row">
                        <button className="btn" type="button" onClick={() => openEditForm(student)}>Sửa</button>
                        <button className="btn outline danger" type="button" onClick={() => handleDelete(student.id)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isFormOpen && (
        <div className="modal-backdrop" onClick={closeForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingStudent ? 'Sửa sinh viên' : 'Thêm sinh viên mới'}</h3>
              <button className="modal-close" onClick={closeForm}>×</button>
            </div>
            <form className="form-stack" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="profile-field">
                  <span>Mã sinh viên</span>
                  <input name="studentCode" value={form.studentCode} onChange={handleChange} required />
                </label>
                <label className="profile-field">
                  <span>Họ tên</span>
                  <input name="fullName" value={form.fullName} onChange={handleChange} required />
                </label>
                <label className="profile-field">
                  <span>Lớp</span>
                  <input name="className" value={form.className} onChange={handleChange} />
                </label>
                <label className="profile-field">
                  <span>Chuyên ngành</span>
                  <input name="majorName" value={form.majorName} onChange={handleChange} />
                </label>
                <label className="profile-field">
                  <span>Doanh nghiệp</span>
                  <input name="enterpriseName" value={form.enterpriseName} onChange={handleChange} />
                </label>
                <label className="profile-field">
                  <span>Mentor</span>
                  <input name="mentorName" value={form.mentorName} onChange={handleChange} />
                </label>
                <label className="profile-field">
                  <span>Kỳ thực tập</span>
                  <select name="periodId" value={form.periodId} onChange={handleChange}>
                    <option value="">Chọn kỳ</option>
                    {periods.map((period) => (
                      <option key={period.id} value={period.id}>{period.name}</option>
                    ))}
                  </select>
                </label>
                <label className="profile-field">
                  <span>Trạng thái</span>
                  <select name="status" value={form.status} onChange={handleChange}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </label>
              </div>
              <div className="button-row">
                <button className="btn" type="submit">Lưu</button>
                <button className="btn outline" type="button" onClick={closeForm}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentManagementPage;
