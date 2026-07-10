import { useEffect, useState } from 'react';
import { getNotifications, markAsRead } from '../services/notificationService';

function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      setItems(res.data || res || []);
    } catch (e) {
      setItems([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleMark = async (id) => {
    try {
      await markAsRead(id);
      setItems((cur) => cur.map((it) => it.id === id ? { ...it, read: true } : it));
    } catch (e) { console.error(e); }
  };

  return (
    <div className="page-shell">
      <section className="card">
        <h2>Thông báo</h2>
        {loading ? <p>Đang tải...</p> : items.length === 0 ? <p>Không có thông báo.</p> : (
          <ul className="notification-list">
            {items.map((n) => (
              <li key={n.id} className={n.read ? 'read' : 'unread'}>
                <div className="notification-head">
                  <strong>{n.title}</strong>
                  {!n.read && <button className="btn small" onClick={() => handleMark(n.id)}>Đã đọc</button>}
                </div>
                <div className="notification-body">{n.message}</div>
                <small className="muted">{new Date(n.createdAt).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default NotificationsPage;

