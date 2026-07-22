import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markAsRead } from '../services/notificationService';
import PageHeader from '../components/PageHeader';
import { notifySuccess } from '../utils/toast';

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
      notifySuccess('Đã đánh dấu thông báo là đã đọc');
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
      <PageHeader title="Thông báo" description="Theo dõi các thông báo quan trọng về báo cáo, nhiệm vụ và cập nhật hệ thống." />
      <section className="card">
        <h2>Thông báo</h2>
        {loading ? (
          <div className="loading-grid">
            <div className="skeleton" style={{ height: 72, borderRadius: 14 }} />
            <div className="skeleton" style={{ height: 72, borderRadius: 14 }} />
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state-card">Không có thông báo nào tại thời điểm này.</div>
        ) : (
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

