import { useEffect, useState } from 'react';
import { getLoginHistory } from '../services/authService';

export default function LoginHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getLoginHistory();
        if (res.success) setHistory(res.data || []);
        else setMessage(res.message || 'Không tải được lịch sử');
      } catch (err) {
        setMessage(err.response?.data?.message || err.message || 'Lỗi');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="page-shell">
      <div className="card">
        <h3>Lịch sử đăng nhập</h3>
        {loading ? (
          <p>Đang tải...</p>
        ) : message ? (
          <p>{message}</p>
        ) : history.length === 0 ? (
          <p>Chưa có bản ghi đăng nhập.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eef2f7' }}>
                <th style={{ padding: '8px' }}>Thời gian</th>
                <th style={{ padding: '8px' }}>Trạng thái</th>
                <th style={{ padding: '8px' }}>IP</th>
                <th style={{ padding: '8px' }}>Thiết bị</th>
                <th style={{ padding: '8px' }}>User agent</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '8px' }}>{h.loginAt ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(h.loginAt)) : ''}</td>
                  <td style={{ padding: '8px' }}>{h.loginStatus}</td>
                  <td style={{ padding: '8px' }}>{h.ipAddress || '-'}</td>
                  <td style={{ padding: '8px' }}>{h.deviceName || '-'}</td>
                  <td style={{ padding: '8px', maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.userAgent || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
