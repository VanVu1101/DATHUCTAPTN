import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import './Sidebar.css';
import { getUnreadCount } from '../services/notificationService';
import { getChatUnreadCount } from '../services/chatService';
import AppIcon from './AppIcon';
import { preloadHeavyRoutes } from '../utils/preloadRoutes';

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
    { to: '/', icon: 'home', label: 'Tổng quan' },
    { to: '/dashboard', icon: 'chart', label: 'Dashboard', adminOnly: true },
    { to: '/profile', icon: 'user', label: 'Hồ sơ cá nhân', roles: ['STUDENT', 'ENTERPRISE'] },
    { to: '/internship-info', icon: 'book', label: 'Thông tin thực tập', roles: ['STUDENT', 'ENTERPRISE'] },
    { to: '/goals', icon: 'target', label: 'Mục tiêu thực tập', roles: ['STUDENT', 'ENTERPRISE'] },
    { to: '/checkin', icon: 'check', label: 'Check-in & Lịch họp' },
    { to: '/tasks', icon: 'task', label: 'Nhiệm vụ' },
    { to: '/reports', icon: 'report', label: 'Báo cáo' },
    { to: '/evaluations', icon: 'spark', label: 'Đánh giá', comingSoon: true },
    { to: '/badges', icon: 'spark', label: 'Huy hiệu', comingSoon: true },
    { to: '/certificates', icon: 'document', label: 'Chứng nhận', comingSoon: true },
    { to: '/chat', icon: 'message', label: 'Tin nhắn', roles: ['STUDENT', 'ENTERPRISE'] },
    { to: '/notifications', icon: 'bell', label: 'Thông báo' },
    { to: '/mentors', icon: 'mentor', label: 'Quản lý mentor', roles: ['ADMIN', 'ENTERPRISE'] },
    { to: '/students', icon: 'student', label: 'Quản lý sinh viên', adminOnly: true },
    { to: '/majors', icon: 'book', label: 'Quản lý chuyên ngành', adminOnly: true },
    { to: '/periods/new', icon: 'plus', label: 'Tạo kỳ thực tập', adminOnly: true },
    { to: '/final-report', icon: 'document', label: 'Báo cáo cuối kỳ', comingSoon: true },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem('sidebarCollapsed');
      return stored === 'true';
    } catch {
      return false;
    }
  });
  const avatarRef = useRef(null);
  const [unread, setUnread] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);

  const handleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', newState.toString());
  };

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

  const handleNavHover = (item) => {
    const preloads = {
      '/dashboard': ['/dashboard'],
      '/reports': ['/reports'],
      '/chat': ['/chat'],
      '/checkin': ['/checkin'],
      '/tasks': ['/tasks'],
      '/profile': ['/profile'],
      '/goals': ['/goals'],
    };

    const paths = preloads[item.to];
    if (paths) preloadHeavyRoutes(paths);
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="brand-mark">IO</div>
        {!isCollapsed && (
          <div className="brand-info">
            <div className="brand-title">Internship</div>
            <div className="brand-subtitle">Operations</div>
          </div>
        )}
        <button
          className="collapse-toggle"
          onClick={handleCollapse}
          title={isCollapsed ? 'Mở rộng' : 'Rút gọn'}
          aria-label="Toggle sidebar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {isCollapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
          </svg>
        </button>
      </div>

      <nav className="sidebar-nav">
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
                className="sidebar-item disabled"
                title={`${item.label} (sắp có)`}
              >
                <span className="icon"><AppIcon name={item.icon} /></span>
                {!isCollapsed && (
                  <span className="label">
                    {item.label}
                    <span className="coming-soon">sắp có</span>
                  </span>
                )}
              </span>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
              title={item.label}
              onMouseEnter={() => handleNavHover(item)}
              onFocus={() => handleNavHover(item)}
            >
              <span className="icon-wrapper">
                <span className="icon"><AppIcon name={item.icon} /></span>
                {item.to === '/notifications' && unread > 0 ? <span className="icon-indicator"></span> : null}
                {item.to === '/chat' && chatUnread > 0 ? <span className="icon-indicator"></span> : null}
              </span>
              {!isCollapsed && (
                <>
                  <span className="label">
                    {item.label}
                  </span>
                  {(item.to === '/notifications' && unread > 0) || (item.to === '/chat' && chatUnread > 0) ? (
                    <span className="badge">{item.to === '/notifications' ? (unread > 99 ? '99+' : unread) : (chatUnread > 99 ? '99+' : chatUnread)}</span>
                  ) : null}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="avatar-wrapper" ref={avatarRef}>
          <button className="avatar avatar-button" onClick={() => setMenuOpen((s) => !s)} title="Tài khoản">
            {initials}
          </button>
          {menuOpen && (
            <div className={`avatar-menu ${isCollapsed ? 'collapsed-menu' : ''}`}>
              <div className="avatar-menu-user">
                <div className="avatar avatar-sm">{initials}</div>
                {!isCollapsed && (
                  <div>
                    <div className="avatar-name">{(storedUser && (() => { try { return JSON.parse(storedUser)?.fullName || JSON.parse(storedUser)?.name; } catch (e) { return ''; } })()) || ''}</div>
                    <div className="avatar-role">{userRole || ''}</div>
                  </div>
                )}
              </div>
              <div className="avatar-menu-actions">
                <button className="sidebar-item small" onClick={() => { setMenuOpen(false); navigate('/profile'); }}>
                  <span className="icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  </span>
                  {!isCollapsed && <span>Chỉnh hồ sơ</span>}
                </button>
                <button className="sidebar-item small" onClick={() => { setMenuOpen(false); handleLogout(); }}>
                  <span className="icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                  </span>
                  {!isCollapsed && <span>Đăng xuất</span>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
