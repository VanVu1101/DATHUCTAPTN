const routeLoaders = {
  '/dashboard': () => import('../pages/DashboardPage.jsx'),
  '/checkin': () => import('../pages/CheckInPage.jsx'),
  '/reports': () => import('../pages/ReportPage.jsx'),
  '/tasks': () => import('../pages/TasksPage.jsx'),
  '/profile': () => import('../pages/ProfilePage.jsx'),
  '/internship-info': () => import('../pages/InternshipInfo.jsx'),
  '/goals': () => import('../pages/GoalsPage.jsx'),
  '/chat': () => import('../pages/ChatPage.jsx'),
  '/notifications': () => import('../pages/NotificationsPage.jsx'),
  '/mentors': () => import('../pages/MentorManagementPage.jsx'),
  '/students': () => import('../pages/StudentManagementPage.jsx'),
  '/majors': () => import('../pages/MajorManagementPage.jsx'),
  '/periods': () => import('../pages/InternshipPeriodsPage.jsx'),
  '/periods/new': () => import('../pages/InternshipPeriodsPage.jsx'),
  '/final-report': () => import('../pages/FinalReportPage.jsx'),
  '/qr-kiosk': () => import('../pages/QRKioskPage.jsx'),
  '/qr-checkin': () => import('../pages/QRCheckinPage.jsx'),
};

const loadedRoutes = new Set();

export function preloadRoute(path) {
  const loader = routeLoaders[path];
  if (!loader || loadedRoutes.has(path)) return Promise.resolve();

  loadedRoutes.add(path);
  return loader().catch((error) => {
    loadedRoutes.delete(path);
    return Promise.reject(error);
  });
}

export function preloadHeavyRoutes(paths = ['/dashboard', '/reports', '/chat', '/checkin', '/tasks', '/profile', '/goals']) {
  return Promise.allSettled(paths.map((path) => preloadRoute(path)));
}
