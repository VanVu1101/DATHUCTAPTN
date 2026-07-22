import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useEffect, useState } from 'react';
import Breadcrumbs from '../components/Breadcrumbs';

function MainLayout() {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  const todayLabel = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const roleLabel = user?.role === 'ADMIN' ? 'Quản trị viên' : user?.role === 'MENTOR' ? 'Mentor' : user?.role === 'ENTERPRISE' ? 'Doanh nghiệp' : 'Người dùng';

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch (e) { setUser(null); }
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <div className={`app-shell${darkMode ? ' dark' : ''}`}>
      <Sidebar />
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-brand-group">
            <div className="brand-mark">IO</div>
            <div>
              <div className="brand">Internship OS</div>
              <div className="topbar-subtitle">Hệ thống quản lý thực tập hiện đại</div>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="topbar-pill topbar-date-pill">{todayLabel}</div>
            {user ? <div className="topbar-pill topbar-user-pill">{user.fullName || user.name || 'Người dùng'} · {roleLabel}</div> : null}
            <button className="theme-toggle" onClick={() => setDarkMode((value) => !value)}>{darkMode ? '☀️' : '🌙'}</button>
          </div>
        </header>
        <main className="content-area">
          <div className="content-inner">
            <Breadcrumbs />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
