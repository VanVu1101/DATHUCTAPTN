import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register, requestPasswordReset } from '../services/authService';
import { getMyProfile, persistProfile } from '../services/studentService';
import '../App.css';

function LoginPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [passwordHint, setPasswordHint] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (name === 'password' && mode === 'register') {
      const checks = [
        { label: '8+ ký tự', ok: value.length >= 8 },
        { label: 'Có chữ hoa', ok: /[A-Z]/.test(value) },
        { label: 'Có chữ thường', ok: /[a-z]/.test(value) },
        { label: 'Có số', ok: /[0-9]/.test(value) },
        { label: 'Có ký tự đặc biệt', ok: /[^A-Za-z0-9]/.test(value) }
      ];
      const passed = checks.filter((item) => item.ok).length;
      if (!value) {
        setPasswordHint('');
      } else if (passed === checks.length) {
        setPasswordHint('Mật khẩu mạnh');
      } else {
        setPasswordHint(`Còn thiếu: ${checks.filter((item) => !item.ok).map((item) => item.label).join(', ')}`);
      }
    }
  };

  const storeAuthUser = (authUser, displayName) => {
    const baseUser = {
      ...(authUser || {}),
      id: authUser?.id,
      userId: authUser?.id,
      name: displayName,
      fullName: authUser?.fullName || displayName,
    };
    localStorage.setItem('user', JSON.stringify(baseUser));
    return baseUser;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    const displayName = form.email
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

    if (mode === 'register') {
      const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
      if (!strongPasswordPattern.test(form.password)) {
        setMessage('Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt');
        return;
      }

      if (form.password !== form.confirmPassword) {
        setMessage('Xác nhận mật khẩu không khớp');
        return;
      }

      try {
        const res = await register({ email: form.email, password: form.password });
          if (res && res.success && res.data && res.data.token) {
            localStorage.setItem('token', res.data.token);
            storeAuthUser(res.data.user || { email: form.email, role: 'STUDENT' }, displayName);
            try {
              const prof = await getMyProfile();
              if (prof && prof.success) {
                persistProfile(prof.data);
              }
            } catch (e) {
              // Keep auth user from login/register response.
            }
            setMessage('Đăng ký thành công');
            navigate('/dashboard');
            return;
          }
          setMessage(res?.message || 'Đăng ký thất bại');
      } catch (error) {
        setMessage(error.response?.data?.message || 'Đăng ký thất bại');
      }
      return;
    }

    try {
      const res = await login({ email: form.email, password: form.password });
      if (res && res.success && res.data && res.data.token) {
        localStorage.setItem('token', res.data.token);
        storeAuthUser(res.data.user || { email: form.email, role: 'STUDENT' }, displayName);
        try {
          const prof = await getMyProfile();
          if (prof && prof.success) {
            persistProfile(prof.data);
          }
        } catch (e) {
          // Keep auth user from login response.
        }
        setMessage('Đăng nhập thành công');
        navigate('/dashboard');
        return;
      }
      setMessage(res?.message || 'Đăng nhập thất bại');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Đăng nhập thất bại');
    }
  };

  const handleForgotPassword = async () => {
    if (!form.email) {
      setMessage('Vui lòng nhập email trước khi gửi yêu cầu');
      return;
    }

    try {
      setIsResetting(true);
      const res = await requestPasswordReset(form.email);
      setMessage(res?.message || 'Đã gửi yêu cầu reset mật khẩu');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không thể gửi email reset mật khẩu');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-hero">
          <span className="eyebrow">InternHub</span>
          <h1>{mode === 'login' ? 'Đăng nhập để theo dõi thực tập' : 'Tạo tài khoản mới'}</h1>
          <p>Quản lý tiến độ, báo cáo và mentor tại cùng một nơi.</p>
        </div>

        <div className="auth-panel">
          <div className="auth-toggle">
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setMessage(''); }}>
              Đăng nhập
            </button>
            <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setMessage(''); }}>
              Đăng ký
            </button>
          </div>

          <form onSubmit={handleSubmit} className="form-stack">
            <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
            <input name="password" type="password" placeholder="Mật khẩu" value={form.password} onChange={handleChange} required />

            {mode === 'register' && (
              <>
                <input name="confirmPassword" type="password" placeholder="Xác nhận mật khẩu" value={form.confirmPassword} onChange={handleChange} required />
                {passwordHint && <p className={`form-message ${passwordHint === 'Mật khẩu mạnh' ? 'success' : ''}`}>{passwordHint}</p>}
              </>
            )}

            <button type="submit">{mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</button>
          </form>

          {mode === 'login' && (
            <button type="button" className="btn outline forgot-password-button" onClick={handleForgotPassword} disabled={isResetting}>
              {isResetting ? 'Đang gửi...' : 'Quên mật khẩu?'}
            </button>
          )}

          {message && <p className={`form-message ${message.includes('thành công') ? 'success' : ''}`}>{message}</p>}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
