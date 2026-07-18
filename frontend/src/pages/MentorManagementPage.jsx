import { useEffect, useState } from 'react';
import {
  createMentor,
  deleteMentor,
  getCompanyStudents,
  getMentors,
  updateMentor,
} from '../services/mentorService';
import { assignStudentMentor } from '../services/studentService';

const emptyForm = {
  fullName: '',
  companyName: '',
  phone: '',
  email: '',
  password: '',
};

function MentorManagementPage() {
  const [mentors, setMentors] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [assignment, setAssignment] = useState({ studentId: '', mentorId: '' });
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  })();
  const authUserId = Number(storedUser.userId || storedUser.id);
  const isMentorAccount = mentors.some((mentor) => Number(mentor.userId) === authUserId);

  const load = async () => {
    setLoading(true);
    try {
      const [mentorItems, studentItems] = await Promise.all([getMentors(), getCompanyStudents()]);
      setMentors(mentorItems);
      setStudents(studentItems);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không tải được danh sách mentor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (mentor) => {
    setEditing(mentor);
    setForm({
      fullName: mentor.fullName || '',
      companyName: mentor.companyName || '',
      phone: mentor.phone || '',
      email: mentor.User?.email || '',
      password: '',
    });
    setOpen(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      if (editing) {
        await updateMentor(editing.id, form);
        setMessage('Đã cập nhật mentor.');
      } else {
        await createMentor(form);
        setMessage('Đã tạo mentor và tài khoản đăng nhập.');
      }
      setOpen(false);
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không thể lưu mentor.');
    }
  };

  const remove = async (mentor) => {
    if (!window.confirm(`Xóa mentor ${mentor.fullName}?`)) return;
    try {
      await deleteMentor(mentor.id);
      setMessage('Đã xóa mentor.');
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không thể xóa mentor.');
    }
  };

  const assign = async (event) => {
    event.preventDefault();
    if (!assignment.studentId || !assignment.mentorId) return;
    try {
      await assignStudentMentor(Number(assignment.studentId), Number(assignment.mentorId));
      setMessage('Đã phân công mentor cho sinh viên. Hội thoại chat đã sẵn sàng.');
      setAssignment({ studentId: '', mentorId: '' });
      await load();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không thể phân công mentor.');
    }
  };

  return (
    <div className="page-shell">
      <section className="hero-card">
        <div className="card-header">
          <div>
            <h1>Quản lý mentor</h1>
            <p>Tạo tài khoản mentor và theo dõi số sinh viên được phân công.</p>
          </div>
          {!isMentorAccount && (
            <button type="button" className="btn primary" onClick={openCreate}>Thêm mentor</button>
          )}
        </div>
      </section>

      {message && <div className="info-card"><p>{message}</p></div>}

      {!isMentorAccount && (
        <section className="card">
          <div className="card-header">
            <div>
              <h3>Phân công sinh viên</h3>
              <p>Chỉ hiển thị sinh viên đã được Admin gán đúng tên doanh nghiệp.</p>
            </div>
          </div>
          <form className="report-filters" onSubmit={assign}>
            <select required value={assignment.studentId} onChange={(e) => setAssignment({ ...assignment, studentId: e.target.value })}>
              <option value="">Chọn sinh viên</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.studentCode} — {student.fullName}
                </option>
              ))}
            </select>
            <select required value={assignment.mentorId} onChange={(e) => setAssignment({ ...assignment, mentorId: e.target.value })}>
              <option value="">Chọn mentor</option>
              {mentors.map((mentor) => (
                <option key={mentor.id} value={mentor.id}>{mentor.fullName}</option>
              ))}
            </select>
            <button className="btn" type="submit">Phân công</button>
          </form>
        </section>
      )}

      <section className="card">
        {loading ? <p>Đang tải...</p> : (
          <div className="table-wrapper">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Email đăng nhập</th>
                  <th>Doanh nghiệp</th>
                  <th>Điện thoại</th>
                  <th>SV được giao</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {mentors.length === 0 ? (
                  <tr><td colSpan="6">Chưa có mentor.</td></tr>
                ) : mentors.map((mentor) => (
                  <tr key={mentor.id}>
                    <td>{mentor.fullName}</td>
                    <td>{mentor.User?.email || '—'}</td>
                    <td>{mentor.companyName}</td>
                    <td>{mentor.phone || '—'}</td>
                    <td>{mentor.assignedStudentCount || 0}</td>
                    <td>
                      {!isMentorAccount ? (
                        <div className="button-row">
                          <button type="button" className="btn" onClick={() => openEdit(mentor)}>Sửa</button>
                          <button type="button" className="btn outline danger" onClick={() => remove(mentor)}>Xóa</button>
                        </div>
                      ) : 'Tài khoản mentor'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Sửa mentor' : 'Thêm mentor'}</h3>
              <button type="button" className="modal-close" onClick={() => setOpen(false)}>×</button>
            </div>
            <form className="form-stack" onSubmit={submit}>
              <label className="profile-field">
                <span>Họ tên</span>
                <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </label>
              <label className="profile-field">
                <span>Doanh nghiệp</span>
                <input required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              </label>
              <label className="profile-field">
                <span>Điện thoại</span>
                <input inputMode="numeric" pattern="[0-9]*" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} />
              </label>
              {!editing && (
                <>
                  <label className="profile-field">
                    <span>Email đăng nhập</span>
                    <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </label>
                  <label className="profile-field">
                    <span>Mật khẩu ban đầu</span>
                    <input type="password" minLength="6" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  </label>
                </>
              )}
              <div className="button-row">
                <button className="btn" type="submit">Lưu</button>
                <button className="btn outline" type="button" onClick={() => setOpen(false)}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MentorManagementPage;
