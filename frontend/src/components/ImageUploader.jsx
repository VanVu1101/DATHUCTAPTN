import { useState } from 'react';
import apiClient from '../api/client';

export default function ImageUploader({ folder = 'reports' }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // allow images and pdfs
    if (!f.type.startsWith('image/') && f.type !== 'application/pdf') {
      setError('Vui lòng chọn ảnh hoặc file PDF');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File quá lớn. Tối đa 10MB');
      return;
    }
    setError(null);
    setFile(f);
    if (f.type.startsWith('image/')) {
      const r = new FileReader();
      r.onload = (ev) => setPreview(ev.target.result);
      r.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return setError('Chưa chọn file');
    setUploading(true);
    setResult(null);
    setError(null);
    try {
      const res = await apiClient.post('/upload/presign', {
        fileName: file.name,
        contentType: file.type,
        folder
      });
      const data = res.data;
      if (!data.success) throw new Error(data.message || 'Không lấy được presign URL');

      // Upload file directly to S3 using the presigned URL
      const putRes = await fetch(data.url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });
      if (!putRes.ok) throw new Error('Upload lên S3 thất bại');

      setResult({ key: data.key, publicUrl: data.publicUrl });
    } catch (e) {
      console.error(e);
      setError(e.message || 'Lỗi upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
      <h3>Upload ảnh / file báo cáo lên S3</h3>
      <input type="file" onChange={handleChange} accept="image/*,application/pdf" />
      {preview && (
        <div style={{ marginTop: 12 }}>
          <img src={preview} alt="preview" style={{ width: 160, height: 120, objectFit: 'cover', borderRadius: 6 }} />
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !file}>
          {uploading ? 'Đang upload...' : 'Upload lên S3'}
        </button>
      </div>
      {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}
      {result && (
        <div style={{ marginTop: 12 }}>
          <p>✅ Upload thành công</p>
          <p>Key: <code>{result.key}</code></p>
          {result.publicUrl ? (
            <p>URL: <a href={result.publicUrl} target="_blank" rel="noreferrer">{result.publicUrl}</a></p>
          ) : (
            <p>File đã upload (private). Lấy URL bằng API `getFileUrl` trên server nếu cần.</p>
          )}
        </div>
      )}
    </div>
  );
}
