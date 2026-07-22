import React from 'react';

const PageFallback = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: '1rem',
    color: '#64748b',
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '3px solid rgba(100, 116, 139, 0.1)',
      borderTop: '3px solid #0ea5e9',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
    <p>Đang tải trang...</p>
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

export default PageFallback;
