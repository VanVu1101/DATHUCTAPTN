import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import './Sidebar.css';
import { getUnreadCount } from '../services/notificationService';
import { getChatUnreadCount } from '../services/chatService';

function Sidebar() {
  const storedUser = localStorage.getItem('user');
  let initials = 'AN';
  const userRole = storedUser ? (() => {
    try {
      return JSON.parse(storedUser)?.role;
    } catch (e) {
      return null;
    }
  })() : null;

  if (storedUser) {
    try {
      const parsedUser = JSON.parse(storedUser);
      const name = parsedUser?.name || parsedUser?.email || 'AN';
      initials = name
        .split(/\s+/)
        .slice(0, 2)
        .map((segment) => segment[0]?.toUpperCase() || '')
        .join('');
    } catch (e) {
      initials = 'AN';
    }
  }

  const navItems = [
    { to: '/', icon: '🏠', label: 'Tổng quan' },
    { to: '/dashboard', icon: '📊', label: 'Dashboard', adminOnly: true },
    { to: '/profile', icon: '👤', label: 'Hồ sơ cá nhân', roles: ['STUDENT', 'ENTERPRISE'] },
    { to: '/internship-info', icon: '📚', label: 'Thông tin thực tập', roles: ['STUDENT', 'ENTERPRISE'] },
    { to: '/checkin', icon: '✅', label: 'Check-in & Lịch họp' },
    { to: '/tasks', icon: '📌', label: 'Nhiệm vụ' },
    { to: '/goals', icon: '🎯', label: 'Mục tiêu thực tập', roles: ['STUDENT'] },
    { to: '/reports', icon: '📝', label: 'Báo cáo' },
    { to: '/evaluations', icon: '⭐', label: 'Đánh giá', comingSoon: true },
    { to: '/badges', icon: '🏅', label: 'Huy hiệu', comingSoon: true },
    { to: '/certificates', icon: '🎓', label: 'Chứng nhận', comingSoon: true },
    { to: '/chat', icon: '💬', label: 'Tin nhắn', roles: ['STUDENT', 'ENTERPRISE'] },
    { to: '/notifications', icon: '🔔', label: 'Thông báo' },
    { to: '/mentors', icon: '🧑‍🏫', label: 'Quản lý mentor', roles: ['ADMIN', 'ENTERPRISE'] },
    { to: '/students', icon: '🎓', label: 'Quản lý sinh viên', adminOnly: true },
    { to: '/majors', icon: '📚', label: 'Quản lý chuyên ngành', adminOnly: true },
    { to: '/periods/new', icon: '➕', label: 'Tạo kỳ thực tập', adminOnly: true },
    { to: '/final-report', icon: '📄', label: 'Báo cáo cuối kỳ', comingSoon: true },
  ];

  const showComing = (() => {
    try {
      const v = localStorage.getItem('showComingSoon');
      if (v === null) return false;
      return v === '1' || v === 'true';
    } catch (e) {
      return false;
    }
  })();

  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarRef = useRef(null);
  const [unread, setUnread] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const c = await getUnreadCount();
        if (mounted) setUnread(c);
      } catch (e) {
        // ignore
      }
      if (['STUDENT', 'ENTERPRISE'].includes(userRole)) {
        try {
          const c = await getChatUnreadCount();
          if (mounted) setChatUnread(c);
        } catch (e) {
          // ignore
        }
      }
    };
    load();
    const id = setInterval(load, 30_000);
    window.addEventListener('chat:unread-changed', load);
    return () => {
      mounted = false;
      clearInterval(id);
      window.removeEventListener('chat:unread-changed', load);
    };
  }, [userRole]);

  useEffect(() => {
    const onDoc = (e) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const handleLogout = () => {
    // Clear all auth and cached data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('profile');
    localStorage.removeItem('reportsCache');
    localStorage.removeItem('tasksCache');
    // Redirect to login
    navigate('/login', { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        {navItems.map((item) => {
          if (item.adminOnly && userRole !== 'ADMIN') {
            return null;
          }
          if (item.roles && !item.roles.includes(userRole)) {
            return null;
          }
          if (item.comingSoon && !showComing) {
            return null;
          }

          if (item.comingSoon) {
            return (
              <span
                key={item.to}
                className="icon-btn disabled"
                title={`${item.label} (sắp có)`}
              >
                <span className="icon">{item.icon}</span>
                <span className="label">
                  {item.label}
                  <span className="coming-soon">sắp có</span>
                </span>
              </span>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `icon-btn${isActive ? ' active' : ''}`}
              title={item.label}
            >
              <span className="icon">{item.icon}</span>
              <span className="label">
                {item.label}
                {item.to === '/notifications' && unread > 0 ? <span className="badge">{unread}</span> : null}
                {item.to === '/chat' && chatUnread > 0 ? <span className="badge">{chatUnread}</span> : null}
              </span>
            </NavLink>
          );
        })}
      </div>
      <div className="sidebar-bottom">
        <div className="avatar-wrapper" ref={avatarRef}>
          <button className="avatar avatar-button" onClick={() => setMenuOpen((s) => !s)} title="Tài khoản">
            {initials}
          </button>
          {menuOpen && (
            <div className="avatar-menu">
              <div className="avatar-menu-user">
                <div className="avatar avatar-sm">{initials}</div>
                <div>
                  <div className="avatar-name">{(storedUser && (() => { try { return JSON.parse(storedUser)?.fullName || JSON.parse(storedUser)?.name; } catch (e) { return ''; } })()) || ''}</div>
                  <div className="avatar-role">{userRole || ''}</div>
                </div>
              </div>
              <div className="avatar-menu-actions">
                <button className="icon-btn small" onClick={() => { setMenuOpen(false); navigate('/profile'); }}>Chỉnh hồ sơ</button>
                <button className="icon-btn small" onClick={() => { setMenuOpen(false); handleLogout(); }}>Đăng xuất</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
