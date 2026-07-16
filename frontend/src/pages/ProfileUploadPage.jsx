import UploadAvatar from '../components/UploadAvatar';
import UploadCV from '../components/UploadCV';

export default function ProfileUploadPage() {
  return (
    <div style={{
      maxWidth: '600px',
      margin: '40px auto',
      padding: '20px'
    }}>
      <h1>👤 Hồ sơ của tôi</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Upload avatar và CV của bạn để hoàn thiện hồ sơ
      </p>
      
      <UploadAvatar />
      <UploadCV />
      
      <div style={{
        marginTop: '40px',
        padding: '15px',
        backgroundColor: '#e3f2fd',
        borderRadius: '8px',
        borderLeft: '4px solid #2196F3'
      }}>
        <p style={{ margin: 0, color: '#1976D2' }}>
          <strong>💡 Mẹo:</strong> Các tệp của bạn sẽ được lưu trữ an toàn trên Amazon S3
        </p>
      </div>
    </div>
  );
}
