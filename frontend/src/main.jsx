import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import LoginHistoryPage from './pages/LoginHistoryPage.jsx';
import InternshipPeriodsPage from './pages/InternshipPeriodsPage.jsx';
import PeriodDetailPage from './pages/PeriodDetailPage.jsx';
import CheckInPage from './pages/CheckInPage.jsx';
import ReportPage from './pages/ReportPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import StudentManagementPage from './pages/StudentManagementPage.jsx';
import MajorManagementPage from './pages/MajorManagementPage.jsx';
import InternshipInfo from './pages/InternshipInfo.jsx';
import GoalsPage from './pages/GoalsPage.jsx';
import EvaluationsPage from './pages/EvaluationsPage.jsx';
import BadgesPage from './pages/BadgesPage.jsx';
import CertificatesPage from './pages/CertificatesPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import FinalReportPage from './pages/FinalReportPage.jsx';
import ProfileUploadPage from './pages/ProfileUploadPage.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
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
              <Route path="profile" element={<ProfilePage />} />
              <Route path="profile/upload" element={<ProfileUploadPage />} />
              <Route path="profile/history" element={<LoginHistoryPage />} />
              <Route path="internship-info" element={<InternshipInfo />} />
              <Route path="goals" element={<GoalsPage />} />
              <Route path="evaluations" element={<EvaluationsPage />} />
              <Route path="badges" element={<BadgesPage />} />
              <Route path="certificates" element={<CertificatesPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="final-report" element={<FinalReportPage />} />
              <Route path="periods" element={<InternshipPeriodsPage />} />
              <Route path="periods/new" element={<InternshipPeriodsPage />} />
              <Route path="periods/:id" element={<PeriodDetailPage />} />
            </Route>
          </Route>
          <Route path="login" element={<LoginPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
        </Route>
      </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
