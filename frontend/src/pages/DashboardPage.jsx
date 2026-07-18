import '../App.css';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const user = stored ? JSON.parse(stored) : null;
    if (!user || user.role !== 'ADMIN') {
      navigate('/', { replace: true });
      return;
    }

    const load = async () => {
      try {
        const ds = await (await import('../services/dashboardService')).getStats();
        if (ds && ds.success) setStats(ds.data);
      } catch (e) {
        // ignore
      }
    };
    load();
  }, [navigate]);

  const items = stats
    ? [
        { title: 'Sinh viên', value: stats.totalStudents, to: '/students' },
        { title: 'Đợt thực tập', value: stats.totalInternships, to: '/periods' },
        { title: 'Báo cáo chờ duyệt', value: stats.pendingReports, to: '/reports?status=SUBMITTED' },
        { title: 'Check-in', value: stats.totalCheckIns, to: '/checkin' },
        { title: 'Doanh nghiệp', value: stats.totalEnterprises, to: '/mentors' },
      ]
    : [
        { title: 'Sinh viên', value: '—', to: '/students' },
        { title: 'Đợt thực tập', value: '—', to: '/periods' },
        { title: 'Báo cáo chờ duyệt', value: '—', to: '/reports?status=SUBMITTED' },
        { title: 'Check-in', value: '—', to: '/checkin' },
        { title: 'Doanh nghiệp', value: '—', to: '/mentors' },
      ];

  return (
    <div className="page-shell">
      <h1>Dashboard</h1>
      <div className="stats-grid">
        {items.map((item) => (
          <div
            className="stat-card"
            key={item.title}
            role="link"
            tabIndex="0"
            onClick={() => navigate(item.to)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') navigate(item.to);
            }}
            style={{ cursor: 'pointer' }}
          >
            <h3>{item.title}</h3>
            <p>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
