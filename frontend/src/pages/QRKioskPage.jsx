import '../App.css';
import { useState } from 'react';
import { generateQr } from '../services/checkInService';

function QRKioskPage() {
  const [expires, setExpires] = useState(10);
  const [result, setResult] = useState(null);
  const [meetingId, setMeetingId] = useState('');

  const handleGenerate = async () => {
    try {
      const res = await generateQr({ meetingId: meetingId || null, expiresMinutes: Number(expires) });
      if (res?.success) setResult(res.data);
      else setResult({ error: res?.message || 'Không tạo được QR' });
    } catch (e) {
      setResult({ error: e?.response?.data?.message || e.message });
    }
  };

  return (
    <div className="page-shell">
      <div className="card">
        <h2>QR Kiosk — Tạo mã điểm danh</h2>
        <div className="form-stack">
          <label>Meeting ID (tuỳ chọn)</label>
          <input value={meetingId} onChange={(e) => setMeetingId(e.target.value)} placeholder="ID cuộc họp" />
          <label>Hết hạn (phút)</label>
          <input type="number" min="1" value={expires} onChange={(e) => setExpires(e.target.value)} />
          <div className="button-row">
            <button className="btn" onClick={handleGenerate}>Tạo QR</button>
          </div>
        </div>

        {result && (
          <div style={{ marginTop: 16 }}>
            {result.error ? (
              <div className="info-card"><p>{result.error}</p></div>
            ) : (
              <div>
                <p>URL:</p>
                <a href={result.url} target="_blank" rel="noreferrer">{result.url}</a>
                <p style={{ marginTop: 8 }}>QR:</p>
                <img alt="qr" src={`https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(result.url)}`} />
                <p>Hết hạn sau {result.expiresMinutes} phút</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default QRKioskPage;
