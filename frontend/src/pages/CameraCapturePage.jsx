import CameraCapture from '../components/CameraCapture';

export default function CameraCapturePage() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Camera Capture Test</h2>
      <p>Cho phép chụp ảnh bằng camera thiết bị và upload lên S3.</p>
      <CameraCapture folder="reports" />
    </div>
  );
}
