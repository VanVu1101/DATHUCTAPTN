import React, { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ErrorBoundaryWithFallback from './components/ErrorBoundaryWithFallback.jsx';
import PageFallback from './components/PageFallback.jsx';

const HomePage = React.lazy(() => import('./pages/HomePage.jsx'));
const LoginPage = React.lazy(() => import('./pages/LoginPage.jsx'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage.jsx'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage.jsx'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage.jsx'));
const LoginHistoryPage = React.lazy(() => import('./pages/LoginHistoryPage.jsx'));
const InternshipPeriodsPage = React.lazy(() => import('./pages/InternshipPeriodsPage.jsx'));
const PeriodDetailPage = React.lazy(() => import('./pages/PeriodDetailPage.jsx'));
const CheckInPage = React.lazy(() => import('./pages/CheckInPage.jsx'));
const QRKioskPage = React.lazy(() => import('./pages/QRKioskPage.jsx'));
const QRCheckinPage = React.lazy(() => import('./pages/QRCheckinPage.jsx'));
const ReportPage = React.lazy(() => import('./pages/ReportPage.jsx'));
const TasksPage = React.lazy(() => import('./pages/TasksPage.jsx'));
const ImageUploaderPage = React.lazy(() => import('./pages/ImageUploaderPage.jsx'));
const CameraCapturePage = React.lazy(() => import('./pages/CameraCapturePage.jsx'));
const StudentManagementPage = React.lazy(() => import('./pages/StudentManagementPage.jsx'));
const MajorManagementPage = React.lazy(() => import('./pages/MajorManagementPage.jsx'));
const InternshipInfo = React.lazy(() => import('./pages/InternshipInfo.jsx'));
const GoalsPage = React.lazy(() => import('./pages/GoalsPage.jsx'));
const EvaluationsPage = React.lazy(() => import('./pages/EvaluationsPage.jsx'));
const BadgesPage = React.lazy(() => import('./pages/BadgesPage.jsx'));
const CertificatesPage = React.lazy(() => import('./pages/CertificatesPage.jsx'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage.jsx'));
const FinalReportPage = React.lazy(() => import('./pages/FinalReportPage.jsx'));
const ProfileUploadPage = React.lazy(() => import('./pages/ProfileUploadPage.jsx'));
const ChatPage = React.lazy(() => import('./pages/ChatPage.jsx'));
const MentorManagementPage = React.lazy(() => import('./pages/MentorManagementPage.jsx'));
const UserManagementPage = React.lazy(() => import('./pages/UserManagementPage.jsx'));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
      <ErrorBoundaryWithFallback>
      <Routes>
        <Route path="/" element={<App />}>
          <Route element={<MainLayout />}>
            <Route index element={<HomePage />} />
              <Route element={<ProtectedRoute />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="checkin" element={<CheckInPage />} />
              <Route path="reports" element={<ReportPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="students" element={<StudentManagementPage />} />
              <Route path="majors" element={<MajorManagementPage />} />
              <Route element={<ProtectedRoute allowedRoles={['STUDENT', 'ENTERPRISE']} />}>
                <Route path="profile" element={<ProfilePage />} />
                <Route path="profile/upload" element={<ProfileUploadPage />} />
                <Route path="profile/history" element={<LoginHistoryPage />} />
                <Route path="internship-info" element={<InternshipInfo />} />
                <Route path="goals" element={<GoalsPage />} />
              </Route>
              <Route path="evaluations" element={<EvaluationsPage />} />
              <Route path="badges" element={<BadgesPage />} />
              <Route path="certificates" element={<CertificatesPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route element={<ProtectedRoute allowedRoles={['STUDENT', 'ENTERPRISE']} />}>
                <Route path="chat" element={<ChatPage />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'ENTERPRISE']} />}>
                <Route path="mentors" element={<MentorManagementPage />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="qr-kiosk" element={<QRKioskPage />} />
                <Route path="users" element={<UserManagementPage />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={['STUDENT', 'ENTERPRISE', 'ADMIN']} />}>
                <Route path="qr-checkin" element={<QRCheckinPage />} />
              </Route>
              <Route path="final-report" element={<FinalReportPage />} />
              <Route path="periods" element={<InternshipPeriodsPage />} />
              <Route path="periods/new" element={<InternshipPeriodsPage />} />
              <Route path="periods/:id" element={<PeriodDetailPage />} />
              <Route path="upload-test" element={<ImageUploaderPage />} />
              <Route path="camera-capture" element={<CameraCapturePage />} />
            </Route>
          </Route>
          <Route path="login" element={<LoginPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
        </Route>
      </Routes>
      </ErrorBoundaryWithFallback>
      </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
