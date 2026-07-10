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
      navigate('/checkin', { replace: true });
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
        { title: 'Sinh viên', value: stats.totalStudents },
        { title: 'Đợt thực tập', value: stats.totalInternships },
        { title: 'Báo cáo chờ duyệt', value: stats.pendingReports },
        { title: 'Check-in', value: stats.totalCheckIns },
        { title: 'Doanh nghiệp', value: stats.totalEnterprises },
      ]
    : [
        { title: 'Sinh viên', value: '—' },
        { title: 'Đợt thực tập', value: '—' },
        { title: 'Báo cáo chờ duyệt', value: '—' },
        { title: 'Check-in', value: '—' },
        { title: 'Doanh nghiệp', value: '—' },
      ];

  return (
    <div className="page-shell">
      <h1>Dashboard</h1>
      <div className="stats-grid">
        {items.map((item) => (
          <div className="stat-card" key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
