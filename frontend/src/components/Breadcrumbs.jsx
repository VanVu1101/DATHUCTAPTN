import { Link, useLocation } from 'react-router-dom';

const routeLabels = {
  '/': 'Tổng quan',
  '/dashboard': 'Dashboard',
  '/reports': 'Báo cáo',
  '/tasks': 'Nhiệm vụ',
  '/students': 'Sinh viên',
  '/periods': 'Đợt thực tập',
  '/notifications': 'Thông báo',
  '/profile': 'Hồ sơ',
  '/chat': 'Tin nhắn',
  '/checkin': 'Check-in',
  '/mentors': 'Mentor',
};

function Breadcrumbs() {
  const location = useLocation();
  const pathname = location.pathname;
  const parts = pathname.split('/').filter(Boolean);

  const items = parts.map((part, index) => {
    const to = `/${parts.slice(0, index + 1).join('/')}`;
    const label = routeLabels[to] || part;
    return { to, label };
  });

  return (
    <nav className="breadcrumb" aria-label="breadcrumb">
      <Link to="/">Trang chủ</Link>
      {items.map((item, index) => (
        <span key={item.to}>
          <span className="breadcrumb-separator">/</span>
          {index === items.length - 1 ? <span>{item.label}</span> : <Link to={item.to}>{item.label}</Link>}
        </span>
      ))}
    </nav>
  );
}

export default Breadcrumbs;
