import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../App.css';
import PageHeader from '../components/PageHeader';
import { getUsers, updateUserRole } from '../services/authService';
import { notifyError, notifySuccess } from '../utils/toast';

const roleOptions = [
  { value: 'STUDENT', label: 'Sinh viên' },
  { value: 'ENTERPRISE', label: 'Doanh nghiệp' },
  { value: 'ADMIN', label: 'Quản trị viên' }
];

function UserManagementPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const currentUser = stored ? JSON.parse(stored) : null;
    if (!currentUser || currentUser.role !== 'ADMIN') {
      navigate('/', { replace: true });
      return;
    }

    const loadUsers = async () => {
      try {
        setLoading(true);
        const res = await getUsers();
        if (res?.success) {
          setUsers(res.data || []);
        } else {
          notifyError(res?.message || 'Không tải được danh sách người dùng');
        }
      } catch (error) {
        notifyError(error.response?.data?.message || 'Không tải được danh sách người dùng');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [navigate]);

  const handleRoleChange = async (userId, role) => {
    try {
      setSavingId(userId);
      const res = await updateUserRole(userId, role);
      if (res?.success) {
        setUsers((current) => current.map((item) => item.id === userId ? { ...item, role } : item));
        notifySuccess('Đã cập nhật vai trò');
      } else {
        notifyError(res?.message || 'Cập nhật vai trò thất bại');
      }
    } catch (error) {
      notifyError(error.response?.data?.message || 'Cập nhật vai trò thất bại');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Quản lý người dùng"
        description="Đổi vai trò cho tài khoản từ bảng điều khiển admin"
      />

      <section className="card">
        {loading ? (
          <p>Đang tải...</p>
        ) : (
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>
                      <select value={user.role || 'STUDENT'} onChange={(e) => handleRoleChange(user.id, e.target.value)} disabled={savingId === user.id}>
                        {roleOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>{savingId === user.id ? 'Đang lưu...' : 'Có thể đổi vai trò'}</td>
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

export default UserManagementPage;
