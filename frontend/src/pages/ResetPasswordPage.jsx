import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import '../App.css';

function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (password.length < 6) {
      setMessage('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Xác nhận mật khẩu không khớp');
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.post('/auth/reset-password', {
        email: query.get('email'),
        token: query.get('token'),
        newPassword: password
      });

      if (res.data?.success) {
        setMessage('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập lại.');
        setTimeout(() => navigate('/login'), 1200);
      } else {
        setMessage(res.data?.message || 'Đặt lại mật khẩu thất bại');
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Đặt lại mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-hero">
          <span className="eyebrow">InternHub</span>
          <h1>Đặt lại mật khẩu</h1>
          <p>Nhập mật khẩu mới cho tài khoản của bạn.</p>
        </div>

        <div className="auth-panel">
          <form onSubmit={handleSubmit} className="form-stack">
            <input type="password" placeholder="Mật khẩu mới" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <input type="password" placeholder="Xác nhận mật khẩu mới" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            <button type="submit" disabled={loading}>{loading ? 'Đang xử lý...' : 'Xác nhận'}</button>
          </form>

          {message && <p className={`form-message ${message.includes('thành công') ? 'success' : ''}`}>{message}</p>}
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;