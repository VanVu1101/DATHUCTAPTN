import { Navigate, Outlet } from 'react-router-dom';

function ProtectedRoute({ allowedRoles = null }) {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles) {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
    } catch {
      return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
}

export default ProtectedRoute;
