import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMajors, createMajor, updateMajor, deleteMajor } from '../services/majorService';

function MajorManagementPage() {
  const [user, setUser] = useState(null);
  const [majors, setMajors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const parsed = stored ? JSON.parse(stored) : null;
    setUser(parsed);
    if (parsed?.role !== 'ADMIN') {
      navigate('/', { replace: true });
      return;
    }
    loadMajors();
  }, [navigate]);

  const loadMajors = async () => {
    setLoading(true);
    try {
      const res = await getMajors();
      setMajors(res?.success ? res.data || [] : []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không tải được danh sách chuyên ngành');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      if (editingId) {
        await updateMajor(editingId, form);
        setMessage('Đã cập nhật chuyên ngành');
      } else {
        await createMajor(form);
        setMessage('Đã thêm chuyên ngành');
      }
      setForm({ name: '', description: '' });
      setEditingId(null);
      loadMajors();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Lỗi khi lưu chuyên ngành');
    }
  };

  const handleEdit = (major) => {
    setEditingId(major.id);
    setForm({ name: major.name || '', description: major.description || '' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa chuyên ngành này?')) return;
    try {
      await deleteMajor(id);
      setMessage('Đã xóa chuyên ngành');
      loadMajors();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Xóa chuyên ngành thất bại');
    }
  };

  if (!user) return <div className="page-shell"><p>Đang kiểm tra quyền truy cập...</p></div>;

  return (
    <div className="page-shell">
      <section className="hero-card">
        <div className="card-header">
          <div>
            <h1>Quản lý chuyên ngành</h1>
            <p>Thêm, sửa và xóa các ngành/chuyên ngành cho sinh viên.</p>
          </div>
        </div>
      </section>

      {message && <div className="info-card"><p>{message}</p></div>}

      <section className="card">
        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="profile-field">
              <span>Tên chuyên ngành</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label className="profile-field">
              <span>Mô tả</span>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
          </div>
          <div className="button-row">
            <button className="btn" type="submit">{editingId ? 'Cập nhật' : 'Thêm mới'}</button>
            {editingId ? <button className="btn outline" type="button" onClick={() => { setEditingId(null); setForm({ name: '', description: '' }); }}>Hủy</button> : null}
          </div>
        </form>
      </section>

      <section className="card">
        {loading ? <p>Đang tải...</p> : (
          <div className="table-wrapper">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Tên chuyên ngành</th>
                  <th>Mô tả</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {majors.length === 0 ? (
                  <tr><td colSpan="3">Chưa có chuyên ngành nào.</td></tr>
                ) : majors.map((major) => (
                  <tr key={major.id}>
                    <td>{major.name}</td>
                    <td>{major.description || '—'}</td>
                    <td>
                      <div className="button-row">
                        <button className="btn" type="button" onClick={() => handleEdit(major)}>Sửa</button>
                        <button className="btn outline danger" type="button" onClick={() => handleDelete(major.id)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default MajorManagementPage;
