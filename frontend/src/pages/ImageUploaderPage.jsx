import ImageUploader from '../components/ImageUploader';

export default function ImageUploaderPage() {
  return (
    <div style={{ padding: 20 }}>
      <h2>Upload thử file lên S3</h2>
      <p>Dùng để test presigned upload từ client.</p>
      <ImageUploader folder="reports" />
    </div>
  );
}
