import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markAsRead } from '../services/notificationService';
import PageHeader from '../components/PageHeader';
import { notifySuccess } from '../utils/toast';

const getNotificationMeta = (notification) => {
  const type = notification?.type || '';
  if (type.includes('REPORT') || type.includes('REPORT')) {
    return { icon: '📝', label: 'Báo cáo' };
  }
  if (type.includes('TASK')) {
    return { icon: '✅', label: 'Nhiệm vụ' };
  }
  if (type.includes('CHAT')) {
    return { icon: '💬', label: 'Trò chuyện' };
  }
  if (type.includes('MEETING')) {
    return { icon: '📅', label: 'Lịch họp' };
  }
  return { icon: '🔔', label: 'Thông báo' };
};

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

  const unreadCount = items.filter((item) => !item.read).length;

  return (
    <div className="page-shell notification-page">
      <PageHeader title="Thông báo" description="Theo dõi các thông báo quan trọng về báo cáo, nhiệm vụ và cập nhật hệ thống." />
      <section className="card notification-shell">
        <div className="notification-header">
          <div>
            <h2>Thông báo gần đây</h2>
            <p className="notification-subtitle">
              {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc cần xem ngay.` : 'Tất cả thông báo đã được xử lý.'}
            </p>
          </div>
          <div className="notification-summary">
            <span className="notification-pill">{items.length} mục</span>
            <span className={`notification-pill ${unreadCount > 0 ? 'pill-accent' : ''}`}>
              {unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Đã xem hết'}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="loading-grid">
            <div className="skeleton" style={{ height: 90, borderRadius: 18 }} />
            <div className="skeleton" style={{ height: 90, borderRadius: 18 }} />
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state-card">Không có thông báo nào tại thời điểm này.</div>
        ) : (
          <ul className="notification-list">
            {items.map((n) => {
              const meta = getNotificationMeta(n);
              return (
                <li
                  key={n.id}
                  className={`notification-card ${n.read ? 'read' : 'unread'}`}
                  role="button"
                  tabIndex="0"
                  onClick={() => openNotification(n)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') openNotification(n);
                  }}
                >
                  <div className="notification-icon" aria-hidden="true">{meta.icon}</div>
                  <div className="notification-body-block">
                    <div className="notification-head">
                      <div className="notification-title-row">
                        <strong>{n.title}</strong>
                        <span className="notification-chip">{meta.label}</span>
                      </div>
                      {!n.read && (
                        <button
                          className="btn outline small"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleMark(n.id);
                          }}
                        >
                          Đã đọc
                        </button>
                      )}
                    </div>
                    <p className="notification-message">{n.message}</p>
                    <div className="notification-meta-row">
                      <span className="notification-time">{new Date(n.createdAt).toLocaleString('vi-VN')}</span>
                      {!n.read && <span className="notification-dot">Mới</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default NotificationsPage;

