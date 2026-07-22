import '../App.css';

export function SkeletonText({ width = '100%', height = '16px', className = '' }) {
  return (
    <div
      className={`skeleton-loader ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonInput({ height = '40px', className = '' }) {
  return (
    <div
      className={`skeleton-loader ${className}`}
      style={{ width: '100%', height }}
    />
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`skeleton-card ${className}`}>
      <SkeletonText width="60%" height="20px" className="mb-2" />
      <SkeletonText width="100%" height="16px" />
      <SkeletonText width="80%" height="16px" className="mt-2" />
    </div>
  );
}

export function SkeletonForm({ fields = 4, className = '' }) {
  return (
    <div className={`skeleton-form ${className}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} style={{ marginBottom: '16px' }}>
          <SkeletonText width="80px" height="14px" className="mb-1" />
          <SkeletonInput height="40px" />
        </div>
      ))}
      <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
        <SkeletonInput width="120px" height="40px" />
        <SkeletonInput width="100px" height="40px" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ cols = 3, rows = 2, className = '' }) {
  return (
    <div className={`skeleton-grid skeleton-grid-${cols} ${className}`}>
      {Array.from({ length: cols * rows }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default SkeletonText;
