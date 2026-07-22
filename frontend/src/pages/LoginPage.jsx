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
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotStatus, setForgotStatus] = useState('idle');
  const [forgotLink, setForgotLink] = useState('');
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

  const handleForgotPassword = async (e) => {
    e?.preventDefault();
    const email = forgotEmail.trim().toLowerCase();

    if (!email) {
      setForgotStatus('error');
      setForgotMessage('Vui lòng nhập email trước khi gửi yêu cầu');
      return;
    }

    try {
      setIsResetting(true);
      setForgotStatus('idle');
      setForgotMessage('Đang gửi yêu cầu...');
      const res = await requestPasswordReset(email);
      const nextMessage = res?.message || 'Một email chứa liên kết đặt lại mật khẩu đã được gửi tới hộp thư của bạn.';
      setForgotStatus(res?.success ? 'success' : 'error');
      setForgotMessage(nextMessage);
      setMessage(nextMessage);
      setForgotLink(res?.resetLink || '');
      if (res?.success) {
        setForm((prev) => ({ ...prev, email }));
      }
    } catch (error) {
      const fallbackMessage = error.response?.data?.message || 'Không thể gửi email reset mật khẩu';
      setForgotStatus('error');
      setForgotMessage(fallbackMessage);
      setMessage(fallbackMessage);
      setForgotLink('');
    } finally {
      setIsResetting(false);
    }
  };

  const openForgotModal = () => {
    setForgotEmail(form.email || '');
    setForgotMessage('');
    setForgotStatus('idle');
    setForgotLink('');
    setIsForgotOpen(true);
  };

  const copyResetLink = async () => {
    if (!forgotLink) {
      setForgotStatus('error');
      setForgotMessage('Chưa có liên kết khôi phục để sao chép.');
      setMessage('Chưa có liên kết khôi phục để sao chép.');
      return;
    }

    try {
      await navigator.clipboard.writeText(forgotLink);
      setForgotStatus('success');
      setForgotMessage('Đã sao chép liên kết khôi phục vào bộ nhớ tạm.');
      setMessage('Đã sao chép liên kết khôi phục vào bộ nhớ tạm.');
    } catch (error) {
      setForgotStatus('error');
      setForgotMessage('Không thể sao chép tự động. Vui lòng copy liên kết ở dưới.');
      setMessage('Không thể sao chép tự động. Vui lòng copy liên kết ở dưới.');
    }
  };

  const openResetLink = () => {
    if (!forgotLink) {
      setForgotStatus('error');
      setForgotMessage('Chưa có liên kết khôi phục để mở.');
      setMessage('Chưa có liên kết khôi phục để mở.');
      return;
    }

    window.open(forgotLink, '_blank', 'noopener,noreferrer');
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
            <button type="button" className="btn outline forgot-password-button" onClick={openForgotModal} disabled={isResetting}>
              {isResetting ? 'Đang gửi...' : 'Quên mật khẩu?'}
            </button>
          )}

          {message && <p className={`form-message ${message.includes('thành công') ? 'success' : ''}`}>{message}</p>}

          {isForgotOpen && (
            <div className="forgot-modal-overlay" onClick={() => setIsForgotOpen(false)}>
              <div className="forgot-modal" onClick={(e) => e.stopPropagation()}>
                <div className="forgot-modal-header">
                  <h3>Khôi phục mật khẩu</h3>
                  <button type="button" className="ghost-button" onClick={() => setIsForgotOpen(false)}>×</button>
                </div>
                <p className="forgot-help-text">Nhập email của bạn. Nếu hệ thống không gửi được thư, hệ thống vẫn sẽ hiển thị liên kết khôi phục để bạn dùng ngay.</p>

                <form onSubmit={handleForgotPassword} className="form-stack">
                  <input
                    name="forgotEmail"
                    type="email"
                    placeholder="Email đăng ký"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />

                  {forgotMessage && (
                    <p className={`form-message ${forgotStatus === 'success' ? 'success' : 'error'}`}>{forgotMessage}</p>
                  )}

                  {forgotLink && (
                    <div className="forgot-link-box">
                      <span>{forgotLink}</span>
                      <div className="link-actions">
                        <button type="button" className="ghost-button" onClick={copyResetLink}>Sao chép</button>
                        <button type="button" className="ghost-button" onClick={openResetLink}>Mở</button>
                      </div>
                    </div>
                  )}

                  <div className="modal-actions">
                    <button type="submit" disabled={isResetting}>{isResetting ? 'Đang gửi...' : 'Gửi yêu cầu'}</button>
                    <button type="button" className="btn outline" onClick={() => setIsForgotOpen(false)}>Đóng</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
