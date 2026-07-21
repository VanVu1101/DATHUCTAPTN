import { useEffect, useMemo, useState } from 'react';
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

const roleStyles = {
  STUDENT: 'role-chip role-student',
  ENTERPRISE: 'role-chip role-enterprise',
  ADMIN: 'role-chip role-admin',
};

function UserManagementPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');

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

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !keyword || (user.email || '').toLowerCase().includes(keyword);
      const matchesRole = selectedRole === 'ALL' || user.role === selectedRole;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, selectedRole]);

  const summary = useMemo(() => {
    const total = users.length;
    const adminCount = users.filter((user) => user.role === 'ADMIN').length;
    const studentCount = users.filter((user) => user.role === 'STUDENT').length;
    const enterpriseCount = users.filter((user) => user.role === 'ENTERPRISE').length;
    return { total, adminCount, studentCount, enterpriseCount };
  }, [users]);

  return (
    <div className="page-shell">
      <PageHeader
        title="Quản lý người dùng"
        description="Quản lý vai trò và theo dõi tài khoản từ bảng điều khiển admin"
      />

      <section className="user-management-summary-grid">
        <div className="summary-card">
          <p className="summary-label">Tổng người dùng</p>
          <h3>{summary.total}</h3>
        </div>
        <div className="summary-card">
          <p className="summary-label">Quản trị viên</p>
          <h3>{summary.adminCount}</h3>
        </div>
        <div className="summary-card">
          <p className="summary-label">Sinh viên / Doanh nghiệp</p>
          <h3>{summary.studentCount + summary.enterpriseCount}</h3>
        </div>
      </section>

      <section className="card user-management-card">
        <div className="user-management-toolbar">
          <div className="user-search-box">
            <span className="search-icon">🔎</span>
            <input
              type="text"
              placeholder="Tìm theo email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="role-filter" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
            <option value="ALL">Tất cả vai trò</option>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="user-loading-state">Đang tải danh sách người dùng...</div>
        ) : (
          <div className="user-list">
            {filteredUsers.map((user) => (
              <article key={user.id} className="user-list-item">
                <div className="user-main">
                  <div className="user-avatar">{(user.email || 'U').charAt(0).toUpperCase()}</div>
                  <div className="user-info">
                    <div className="user-email">{user.email}</div>
                    <div className="user-meta">Tài khoản đang hoạt động · Có thể đổi vai trò</div>
                  </div>
                </div>
                <div className="user-actions">
                  <span className={roleStyles[user.role] || 'role-chip'}>{roleOptions.find((option) => option.value === user.role)?.label || 'Chưa xác định'}</span>
                  <select
                    className="role-select"
                    value={user.role || 'STUDENT'}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={savingId === user.id}
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </article>
            ))}
            {filteredUsers.length === 0 && (
              <div className="user-empty-state">Không tìm thấy người dùng phù hợp.</div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default UserManagementPage;
