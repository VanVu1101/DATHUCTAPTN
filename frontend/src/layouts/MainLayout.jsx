import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useEffect, useState } from 'react';

function MainLayout() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch (e) { setUser(null); }
    }
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
