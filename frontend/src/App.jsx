import { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import './App.css';
import ToastViewport from './components/ToastViewport';
import { getNotifications } from './services/notificationService';
import { notifyInfo, notifySuccess } from './utils/toast';

function App() {
  const knownIdsRef = useRef(new Set());

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const syncNotifications = async () => {
      try {
        const res = await getNotifications();
        const notifications = Array.isArray(res?.data) ? res.data : [];
        const unreadNotifications = notifications.filter((item) => !item.read);
        const unreadIds = unreadNotifications.map((item) => item.id);
        const newIds = unreadIds.filter((id) => !knownIdsRef.current.has(id));

        if (newIds.length > 0) {
          const latest = unreadNotifications.find((item) => newIds.includes(item.id)) || unreadNotifications[0];
          if (latest) {
            const isReportNotice = ['REPORT_SUBMIT', 'REPORT_CREATED', 'WEEKLY_REPORT_CREATED'].includes(latest.type);
            if (isReportNotice) {
              notifySuccess(latest.message || 'Bạn có thông báo mới');
            } else {
              notifyInfo(latest.message || 'Bạn có thông báo mới');
            }
          }
        }

        knownIdsRef.current = new Set(unreadIds);
      } catch (error) {
        console.error('Notification sync failed:', error.message || error);
      }
    };

    syncNotifications();
    const intervalId = window.setInterval(syncNotifications, 20000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <>
      <Outlet />
      <ToastViewport />
    </>
  );
}

export default App;
