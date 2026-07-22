import '../App.css';
import { useEffect, useState } from 'react';
import { redeemQr } from '../services/checkInService';
import { useSearchParams } from 'react-router-dom';
import { notifySuccess, notifyError } from '../utils/toast';

function QRCheckinPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const doRedeem = async () => {
      if (!token) return setResult({ error: 'Thiếu token' });
      setLoading(true);
      try {
        const res = await redeemQr(token);
        if (res?.success) {
          setResult({ ok: true, data: res.data });
          notifySuccess('Check-in thành công');
        } else {
          setResult({ error: res?.message || 'Không thể điểm danh' });
          notifyError(res?.message || 'Không thể điểm danh');
        }
      } catch (e) {
        setResult({ error: e?.response?.data?.message || e.message });
        notifyError(e?.response?.data?.message || e.message);
      } finally { setLoading(false); }
    };
    doRedeem();
  }, [token]);

  return (
    <div className="page-shell">
      <div className="card">
        <h2>QR Check-in</h2>
        {loading ? <p>Đang xử lý...</p> : result?.ok ? (
          <div>
            <p>Check-in thành công!</p>
            <pre>{JSON.stringify(result.data, null, 2)}</pre>
          </div>
        ) : (
          <div className="info-card"><p>{result?.error || 'Không có token'}</p></div>
        )}
      </div>
    </div>
  );
}

export default QRCheckinPage;
