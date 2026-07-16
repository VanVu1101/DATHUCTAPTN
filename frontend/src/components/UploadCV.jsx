import { useState } from 'react';

export default function UploadCV() {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [documents, setDocuments] = useState([]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png'
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage('❌ Chỉ chấp nhận file PDF, DOC, DOCX, JPG, PNG');
      setMessageType('error');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setMessage('❌ File quá lớn (tối đa 10MB)');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      setFileName(file.name);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('category', 'CV');

      const token = localStorage.getItem('token');
      if (!token) {
        setMessage('❌ Vui lòng đăng nhập trước');
        setMessageType('error');
        return;
      }

      const response = await fetch('http://localhost:5000/api/students/profile/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      console.log('✅ CV uploaded:', data.data.fileUrl);
      setMessage('✅ CV uploaded successfully!');
      setMessageType('success');
      
      // Add to documents list
      setDocuments([...documents, data.data]);
      
      // Clear file input
      e.target.value = '';
      setFileName('');
      
    } catch (error) {
      console.error('❌ Error:', error);
      setMessage('❌ Upload failed: ' + error.message);
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
      backgroundColor: '#f9f9f9',
      marginTop: '20px'
    }}>
      <h3>📄 Upload CV / Tài Liệu</h3>
      <input 
        type="file" 
        accept=".pdf,.doc,.docx,.jpg,.png" 
        onChange={handleUpload}
        disabled={loading}
        style={{
          padding: '8px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      />
      
      {fileName && (
        <p style={{ marginTop: '10px', color: '#666' }}>
          📋 <strong>File được chọn:</strong> {fileName}
        </p>
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

      {documents.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4>📚 Tài liệu đã upload:</h4>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {documents.map((doc) => (
              <li 
                key={doc.id}
                style={{
                  padding: '10px',
                  marginBottom: '8px',
                  backgroundColor: '#e8f5e9',
                  borderRadius: '4px',
                  borderLeft: '4px solid #4CAF50'
                }}
              >
                <a 
                  href={doc.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#4CAF50', textDecoration: 'none', fontWeight: 'bold' }}
                >
                  {doc.title}
                </a>
                <p style={{ fontSize: '12px', color: '#666', margin: '5px 0 0 0' }}>
                  Loại: {doc.category} | Ngày upload: {new Date(doc.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
