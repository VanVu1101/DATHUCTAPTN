import { useEffect, useRef, useState } from 'react';
import apiClient from '../api/client';

export default function CameraCapture({ folder = 'checkins' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (e) {
      console.error('camera start error', e);
      setError('Không thể truy cập camera: ' + (e.message || e));
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  };

  const capture = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const w = v.videoWidth;
    const h = v.videoHeight;
    const canvas = canvasRef.current;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(v, 0, 0, w, h);
    setCapturing(true);
    setResult(null);
  };

  const uploadCapture = async () => {
    setUploading(true);
    setError(null);
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Không có ảnh chụp');
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
      if (!blob) throw new Error('Không thể tạo blob');

      // get presign URL
      const presign = await apiClient.post('/upload/presign', { fileName: `capture-${Date.now()}.jpg`, contentType: 'image/jpeg', folder });
      const data = presign.data;
      if (!data.success) throw new Error(data.message || 'Không lấy được presign URL');

      const putRes = await fetch(data.url, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
      if (!putRes.ok) throw new Error('Upload lên S3 thất bại');

      setResult({ key: data.key, publicUrl: data.publicUrl });
      setCapturing(false);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Lỗi upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
      <h3>Chụp ảnh bằng camera</h3>

      {!stream ? (
        <div>
          <button className="btn btn-primary" onClick={startCamera}>Bắt đầu camera</button>
        </div>
      ) : (
        <div>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxWidth: 480, borderRadius: 8 }} />
          <div style={{ marginTop: 8 }}>
            <button className="btn" onClick={capture}>Chụp</button>
            <button className="btn" onClick={stopCamera} style={{ marginLeft: 8 }}>Dừng camera</button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: capturing ? 'block' : 'none', marginTop: 12, maxWidth: '100%' }} />

      {capturing && (
        <div style={{ marginTop: 8 }}>
          <button className="btn btn-primary" onClick={uploadCapture} disabled={uploading}>{uploading ? 'Đang upload...' : 'Upload ảnh chụp'}</button>
          <button className="btn" onClick={() => setCapturing(false)} style={{ marginLeft: 8 }}>Hủy</button>
        </div>
      )}

      {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 8 }}>
          <p>Upload thành công</p>
          <p>Key: <code>{result.key}</code></p>
          {result.publicUrl ? <p>URL: <a href={result.publicUrl} target="_blank" rel="noreferrer">{result.publicUrl}</a></p> : <p>File private — dùng API để lấy URL khi cần.</p>}
        </div>
      )}
    </div>
  );
}
