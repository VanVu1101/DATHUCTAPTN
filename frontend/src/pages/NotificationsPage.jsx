import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markAsRead } from '../services/notificationService';

function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  const openNotification = async (notification) => {
    if (!notification.read) await handleMark(notification.id);
    const data = typeof notification.data === 'string'
      ? (() => { try { return JSON.parse(notification.data); } catch { return {}; } })()
      : (notification.data || {});
    if (data.path) return navigate(data.path);
    if (data.conversationId || notification.type === 'CHAT_MESSAGE') {
      return navigate(data.conversationId ? `/chat?conversationId=${data.conversationId}` : '/chat');
    }
    if (
      data.reportId
      || data.weeklyReportId
      || ['REPORT_SUBMIT', 'REPORT_CREATED', 'WEEKLY_REPORT_CREATED'].includes(notification.type)
    ) return navigate('/reports');
    if (data.meetingId || notification.type === 'MEETING') return navigate('/checkin');
    if (data.taskId || notification.type === 'TASK') return navigate('/tasks');
    return undefined;
  };

  return (
    <div className="page-shell">
      <section className="card">
        <h2>Thông báo</h2>
        {loading ? <p>Đang tải...</p> : items.length === 0 ? <p>Không có thông báo.</p> : (
          <ul className="notification-list">
            {items.map((n) => (
              <li
                key={n.id}
                className={n.read ? 'read' : 'unread'}
                role="button"
                tabIndex="0"
                onClick={() => openNotification(n)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') openNotification(n);
                }}
              >
                <div className="notification-head">
                  <strong>{n.title}</strong>
                  {!n.read && (
                    <button
                      className="btn small"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleMark(n.id);
                      }}
                    >
                      Đã đọc
                    </button>
                  )}
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

