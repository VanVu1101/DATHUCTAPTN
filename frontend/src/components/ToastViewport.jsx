import { useEffect, useState } from 'react';

function ToastViewport() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const handleToast = (event) => {
      const { message, type = 'info' } = event.detail || {};
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setItems((current) => [...current, { id, message, type }]);
      window.setTimeout(() => {
        setItems((current) => current.filter((item) => item.id !== id));
      }, 3200);
    };

    window.addEventListener('app:toast', handleToast);
    return () => window.removeEventListener('app:toast', handleToast);
  }, []);

  if (!items.length) return null;

  return (
    <div className="toast-viewport" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={`toast toast-${item.type}`}>
          <strong>{item.type === 'success' ? 'Thành công' : item.type === 'error' ? 'Lỗi' : 'Thông báo'}</strong>
          <span>{item.message}</span>
        </div>
      ))}
    </div>
  );
}

export default ToastViewport;
