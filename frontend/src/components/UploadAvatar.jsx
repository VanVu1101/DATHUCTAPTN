import { useState } from 'react';
import { uploadProfileImage } from '../services/studentService';

export default function UploadAvatar() {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage('❌ Vui lòng chọn file ảnh');
      setMessageType('error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('❌ File quá lớn (tối đa 5MB)');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      
      // Hiển thị preview tạm thời
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result);
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append('file', file);

      const data = await uploadProfileImage(formData);
      if (!data?.success) {
        throw new Error(data?.message || 'Upload failed');
      }

      const uploadedUrl = data.data?.profileImageUrl;
      console.log('✅ Avatar uploaded:', uploadedUrl);
      if (uploadedUrl) {
        setPreview(uploadedUrl);
        try {
          const stored = localStorage.getItem('user');
          if (stored) {
            const user = JSON.parse(stored);
            user.profileImageUrl = uploadedUrl;
            localStorage.setItem('user', JSON.stringify(user));
          }
        } catch (e) {
          console.warn('Could not update localStorage user avatar', e);
        }
      }

      setMessage('✅ Avatar uploaded successfully!');
      setMessageType('success');
    } catch (error) {
      console.error('❌ Error:', error);
      setMessage('❌ Upload failed: ' + (error.message || 'Lỗi không xác định'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ddd', 
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>📷 Upload Avatar</h3>
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleUpload}
        disabled={loading}
        style={{
          padding: '8px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      />
      
      {preview && (
        <div style={{ marginTop: '15px' }}>
          <p><strong>Preview:</strong></p>
          <img 
            src={preview} 
            alt="Preview" 
            style={{ 
              width: '120px', 
              height: '120px', 
              objectFit: 'cover',
              borderRadius: '8px',
              border: '2px solid #ddd'
            }} 
          />
        </div>
      )}
      
      {loading && (
        <p style={{ color: '#2196F3', marginTop: '10px' }}>⏳ Đang upload...</p>
      )}
      
      {message && (
        <p style={{ 
          color: messageType === 'success' ? '#4CAF50' : '#f44336',
          marginTop: '10px',
          fontWeight: 'bold'
        }}>
          {message}
        </p>
      )}
    </div>
  );
}
