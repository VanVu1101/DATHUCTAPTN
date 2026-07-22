import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useEffect, useState } from 'react';
import Breadcrumbs from '../components/Breadcrumbs';

function MainLayout() {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch (e) { setUser(null); }
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <div className={`app-shell${darkMode ? ' dark' : ''}`}>
      <Sidebar />
      <div className="main-area">
        <header className="topbar">
          <div>
            <div className="brand">Internship OS</div>
            <div className="topbar-subtitle">Hệ thống quản lý thực tập hiện đại</div>
          </div>
          <div className="topbar-actions">
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
