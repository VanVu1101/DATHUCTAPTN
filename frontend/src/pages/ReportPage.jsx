import '../App.css';
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
const ReportModal = lazy(() => import('../components/ReportModal'));
const ReportScoreModal = lazy(() => import('../components/ReportScoreModal'));
const ReviewReportModal = lazy(() => import('../components/ReviewReportModal'));

const modalFallback = (
  <div className="modal-backdrop">
    <div className="modal compact-modal">
      <div className="skeleton" style={{ height: 160, borderRadius: 20 }} />
    </div>
  </div>
);
import {
  getMyReports,
  getAllReports,
  reviewReport,
  getWeeklyReports,
  getMyWeeklyReports,
  updateReport,
  deleteWeeklyReport,
  getCachedWeeklyReports,
  getCachedUserReports,
} from '../services/reportService';
import { getAllPeriods } from '../services/periodService';
import { getMyProfile } from '../services/studentService';
import { getEvaluationByInternship } from '../services/evaluationService';
import PageHeader from '../components/PageHeader';
import { notifyError, notifySuccess } from '../utils/toast';
import AppCard from '../components/AppCard';
import AppButton from '../components/AppButton';

const resolveFileUrl = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const apiOrigin = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  return `${apiOrigin}${value.startsWith('/') ? '' : '/'}${value}`;
};

const normalizeReportReviewStatus = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (['APPROVED', 'REVIEWED'].includes(normalized)) return 'APPROVED';
  if (['PENDING', 'SUBMITTED', 'WAITING', 'WAIT', 'REVIEW'].includes(normalized)) return 'PENDING';
  if (['REJECTED', 'NEEDS_REVISION', 'NEEDS_REVISON', 'NEEDSREVISON'].includes(normalized)) return 'REJECTED';
  return normalized || 'PENDING';
};

const getReportStatusMeta = (value) => {
  const normalized = normalizeReportReviewStatus(value);
  if (normalized === 'APPROVED') return { label: 'Đã duyệt', className: 'done' };
  if (normalized === 'REJECTED') return { label: 'Cần sửa', className: 'danger' };
  if (normalized === 'PENDING') return { label: 'Chờ duyệt', className: 'warning' };
  return { label: 'Chưa nộp', className: 'neutral' };
};

function ReportPage() {
  const [weeklyReports, setWeeklyReports] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [userReports, setUserReports] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedWeeklyReport, setSelectedWeeklyReport] = useState(null);
  const [selectedWeekId, setSelectedWeekId] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailReport, setSelectedDetailReport] = useState(null);
  const [selectedDetailEvaluation, setSelectedDetailEvaluation] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [submissionDrawerOpen, setSubmissionDrawerOpen] = useState(false);
  const [selectedSubmissionDrawer, setSelectedSubmissionDrawer] = useState(null);
  const [drawerFeedback, setDrawerFeedback] = useState('');
  const [drawerStatus, setDrawerStatus] = useState('APPROVED');
  const [drawerScore, setDrawerScore] = useState('8.0');
  const [drawerSubmitting, setDrawerSubmitting] = useState(false);
  const [selectedReviewReport, setSelectedReviewReport] = useState(null);
  const [selectedAdminReport, setSelectedAdminReport] = useState(null);
  const [modalMode, setModalMode] = useState('submit');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [submissionFilter, setSubmissionFilter] = useState('ALL');
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [adminStatus] = useState(
    () => new URLSearchParams(window.location.search).get('status') || ''
  );

  const loadReports = async () => {
    const cachedWeeklyReports = getCachedWeeklyReports();
    const cachedUserReports = getCachedUserReports();
    if (Array.isArray(cachedWeeklyReports) && cachedWeeklyReports.length > 0) {
      setWeeklyReports(cachedWeeklyReports);
    }
    if (Array.isArray(cachedUserReports) && cachedUserReports.length > 0) {
      setUserReports(cachedUserReports);
    }

    setLoading(true);
    try {
      const stored = localStorage.getItem('user');
      const parsed = stored ? JSON.parse(stored) : null;
      setUser(parsed);

      if (parsed?.role === 'ADMIN') {
        const [weeklyRes, reportRes, periodRes] = await Promise.all([
          getWeeklyReports(),
          getAllReports(adminStatus ? { status: adminStatus } : {}),
          getAllPeriods()
        ]);

        if (weeklyRes?.success) setWeeklyReports(weeklyRes.data || []);
        if (reportRes?.success) setAllReports(reportRes.data || []);
        if (periodRes?.success) setPeriods(periodRes.data || []);
      } else {
        const profileRes = await getMyProfile();
        const periodId = profileRes?.success ? profileRes.data?.periodId : null;
        const [weeklyRes, reportRes, periodRes] = await Promise.all([
          getMyWeeklyReports(periodId),
          getMyReports(),
          getAllPeriods(),
        ]);

        if (profileRes?.success) setProfile(profileRes.data || null);
        if (weeklyRes?.success) setWeeklyReports(weeklyRes.data || []);
        if (reportRes?.success) setUserReports(reportRes.data || []);
        if (periodRes?.success) setPeriods(periodRes.data || []);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không tải được báo cáo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      // Refetch submissions for the selected week.
      const fetchAdminReports = async () => {
        setLoading(true);
        try {
          const res = await getAllReports({
            ...(selectedWeekId ? { weeklyReportId: selectedWeekId } : {}),
            ...(adminStatus ? { status: adminStatus } : {}),
          });
          if (res?.success) setAllReports(res.data || []);
        } catch (e) {
          /* ignore */
        } finally {
          setLoading(false);
        }
      };
      fetchAdminReports();
    }
  }, [selectedWeekId, user?.role, adminStatus]);

  const handleReviewSubmit = async (payload) => {
    if (!selectedReviewReport) return;
    try {
      await reviewReport(selectedReviewReport.id, payload);
      setMessage('Đã cập nhật trạng thái báo cáo.');
      notifySuccess('Đã cập nhật trạng thái báo cáo');
      closeReviewModal();
      loadReports();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không duyệt được báo cáo.');
      notifyError(error.response?.data?.message || 'Không duyệt được báo cáo.');
    }
  };

  const handleDeleteWeeklyReport = async (reportId) => {
    if (!window.confirm('Xóa tuần báo cáo này?')) return;
    try {
      await deleteWeeklyReport(reportId);
      setMessage('Đã xóa tuần báo cáo.');
      notifySuccess('Đã xóa tuần báo cáo');
      loadReports();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Xóa tuần báo cáo thất bại.');
      notifyError(error.response?.data?.message || 'Xóa tuần báo cáo thất bại.');
    }
  };

  const handleViewSubmissions = (weeklyReport) => {
    setSelectedWeekId(String(weeklyReport.id));
    setSubmissionFilter('ALL');
    setSubmissionSearch('');
  };

  const openReviewModal = (report) => {
    setSelectedReviewReport(report);
    setReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setReviewModalOpen(false);
    setSelectedReviewReport(null);
  };

  const openSubmissionDrawer = (report) => {
    setSelectedSubmissionDrawer(report);
    setDrawerFeedback(report?.reviewerNote || report?.feedback || '');
    setDrawerStatus(report?.status === 'REJECTED' ? 'REJECTED' : 'APPROVED');
    const existingScore = getReportScore(report);
    setDrawerScore(existingScore != null ? String(existingScore) : '8.0');
    setSubmissionDrawerOpen(true);
  };

  const closeSubmissionDrawer = () => {
    setSubmissionDrawerOpen(false);
    setSelectedSubmissionDrawer(null);
    setDrawerFeedback('');
    setDrawerStatus('APPROVED');
    setDrawerScore('8.0');
    setDrawerSubmitting(false);
  };

  const handleQuickReviewSubmission = async (status) => {
    const reportToReview = selectedSubmissionDrawer;
    if (!reportToReview) return;
    setDrawerSubmitting(true);
    try {
      const payload = {
        status,
        reviewerNote: drawerFeedback,
      };

      if (status === 'APPROVED') {
        const scoreValue = Number(drawerScore);
        if (!Number.isNaN(scoreValue)) {
          payload.score = scoreValue;
        }
        if (drawerFeedback) {
          payload.feedback = drawerFeedback;
        }
      }

      await reviewReport(reportToReview.id, payload);
      setMessage(status === 'APPROVED' ? 'Đã duyệt báo cáo.' : 'Đã gửi yêu cầu chỉnh sửa.');
      notifySuccess(status === 'APPROVED' ? 'Đã duyệt báo cáo' : 'Đã gửi yêu cầu chỉnh sửa');
      closeSubmissionDrawer();
      loadReports();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không thể cập nhật trạng thái báo cáo.');
      notifyError(error.response?.data?.message || 'Không thể cập nhật trạng thái báo cáo.');
    } finally {
      setDrawerSubmitting(false);
    }
  };

  const handleSaveAdminReport = async (payload) => {
    if (!selectedAdminReport) return;
    try {
      await updateReport(selectedAdminReport.id, payload);
      setMessage('Đã lưu cập nhật báo cáo admin.');
      closeModal();
      loadReports();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không thể lưu báo cáo admin.');
    }
  };

  const openSubmitModal = (weeklyReport) => {
    setSelectedWeeklyReport(weeklyReport);
    setModalMode('submit');
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setSelectedWeeklyReport(null);
    setSelectedAdminReport(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const openWeeklyEditModal = (weeklyReport) => {
    setSelectedWeeklyReport(weeklyReport);
    setSelectedAdminReport(null);
    setModalMode('edit-weekly');
    setIsModalOpen(true);
  };

  const openAdminEditModal = (report) => {
    setSelectedWeeklyReport(null);
    setSelectedAdminReport(report);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const getReportScore = (report) => {
    const scoreFromReport = report.score || report.submission?.score || report.submission?.rating || null;
    const scoreFromEval = report.submission?.evaluation?.score ?? null;
    return scoreFromReport ?? scoreFromEval ?? null;
  };

  const openDetailModal = async (report) => {
    setSelectedDetailReport(report);
    setSelectedDetailEvaluation(null);
    setDetailModalOpen(true);
    // If the submission already includes an evaluation (attached by backend), use it and avoid an extra request
    const existingEval = report?.submission?.evaluation || null;
    if (existingEval) {
      setSelectedDetailEvaluation(existingEval);
      return;
    }

    const internshipId = report?.internshipId || report?.submission?.internshipId || null;
    if (internshipId) {
      try {
        const res = await getEvaluationByInternship(internshipId);
        if (res?.success) {
          setSelectedDetailEvaluation(res.data || null);
        } else {
          setSelectedDetailEvaluation(null);
        }
      } catch (error) {
        // don't surface network 404 to the user; just treat as no evaluation
        setSelectedDetailEvaluation(null);
      }
    }
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedDetailReport(null);
    setSelectedDetailEvaluation(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedWeeklyReport(null);
    setSelectedAdminReport(null);
    loadReports();
  };

  const filteredWeeklyReports = useMemo(() => {
    if (filter === 'ALL') return weeklyReports;
    if (filter === 'DONE') return weeklyReports.filter((item) => ['PENDING', 'APPROVED', 'REJECTED'].includes(normalizeReportReviewStatus(item.submissionStatus)));
    if (filter === 'APPROVED') return weeklyReports.filter((item) => normalizeReportReviewStatus(item.submissionStatus) === 'APPROVED');
    if (filter === 'PENDING') return weeklyReports.filter((item) => normalizeReportReviewStatus(item.submissionStatus) === 'PENDING');
    if (filter === 'REJECTED') return weeklyReports.filter((item) => normalizeReportReviewStatus(item.submissionStatus) === 'REJECTED');
    return weeklyReports;
  }, [filter, weeklyReports]);

  const standaloneReports = useMemo(() => {
    const reports = userReports.filter((report) => !report.weeklyReportId);
    if (filter === 'ALL') return reports;
    if (filter === 'APPROVED') return reports.filter((report) => normalizeReportReviewStatus(report.status) === 'APPROVED');
    if (filter === 'PENDING') return reports.filter((report) => normalizeReportReviewStatus(report.status) === 'PENDING');
    if (filter === 'REJECTED') return reports.filter((report) => normalizeReportReviewStatus(report.status) === 'REJECTED');
    return reports;
  }, [userReports, filter]);

  const selectedWeeklyDetail = useMemo(() => {
    if (!selectedWeekId) return null;
    return weeklyReports.find((item) => String(item.id) === String(selectedWeekId)) || null;
  }, [selectedWeekId, weeklyReports]);

  const visibleSubmissionReports = useMemo(() => {
    const reports = Array.isArray(allReports) ? allReports : [];
    const query = submissionSearch.trim().toLowerCase();

    const filtered = reports.filter((report) => {
      const status = normalizeReportReviewStatus(report.status);
      if (submissionFilter === 'POSTED') {
        return ['PENDING', 'APPROVED', 'REJECTED'].includes(status);
      }
      if (submissionFilter === 'PENDING') {
        return status === 'PENDING';
      }
      if (submissionFilter === 'APPROVED') {
        return status === 'APPROVED';
      }
      if (submissionFilter === 'REJECTED') {
        return status === 'REJECTED';
      }
      return true;
    });

    if (!query) return filtered;

    return filtered.filter((report) => {
      const haystack = [
        report.Student?.fullName,
        report.Student?.studentCode,
        report.content,
        report.fileName,
        report.weekNumber,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [allReports, submissionFilter, submissionSearch]);

  const submissionStats = useMemo(() => {
    const reports = visibleSubmissionReports;
    return {
      total: reports.length,
      pending: reports.filter((report) => normalizeReportReviewStatus(report.status) === 'PENDING').length,
      approved: reports.filter((report) => normalizeReportReviewStatus(report.status) === 'APPROVED').length,
      rejected: reports.filter((report) => normalizeReportReviewStatus(report.status) === 'REJECTED').length,
    };
  }, [visibleSubmissionReports]);

  const showMissingPeriodNotice = !loading && !weeklyReports.length && standaloneReports.length === 0 && user?.role !== 'ADMIN';
  const missingPeriodMessage = profile?.periodId
    ? 'Không tìm thấy mẫu báo cáo tuần nào để nộp.'
    : 'Vui lòng chọn kỳ thực tập trong hồ sơ để xem báo cáo tuần phù hợp.';

  const stats = useMemo(() => {
    const all = weeklyReports.length + standaloneReports.length;
    const approved = [...weeklyReports, ...standaloneReports].filter((item) => normalizeReportReviewStatus(item.submissionStatus || item.status) === 'APPROVED').length;
    const pending = [...weeklyReports, ...standaloneReports].filter((item) => normalizeReportReviewStatus(item.submissionStatus || item.status) === 'PENDING').length;
    const rejected = [...weeklyReports, ...standaloneReports].filter((item) => normalizeReportReviewStatus(item.submissionStatus || item.status) === 'REJECTED').length;
    return { all, approved, pending, rejected };
  }, [weeklyReports, standaloneReports]);


  return (
    <div className="page-shell report-page">
      <PageHeader
        title="Báo cáo tiến độ"
        description={user?.role === 'ADMIN' ? 'Admin tạo báo cáo tuần, sinh viên nộp file theo từng tuần.' : 'Theo dõi trạng thái báo cáo và nộp tệp đúng định dạng.'}
      />
      <AppCard title="Báo cáo tiến độ" subtitle={user?.role === 'ADMIN' ? 'Admin tạo báo cáo tuần, sinh viên nộp file theo từng tuần.' : 'Chọn đúng báo cáo tuần để nộp file và theo dõi trạng thái.'} actions={user?.role === 'ADMIN' ? <AppButton variant="primary" onClick={openCreateModal}>+ Tạo báo cáo mới</AppButton> : <span className="report-legend">Bấm vào tuần để nộp file</span>}>
        <div className="report-hero-inline" />
      </AppCard>

      {message && <div className="info-card"><p>{message}</p></div>}

      <div className="report-summary-grid">
        <div className="report-summary-card">
          <div className="summary-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M15 3v5h5" /></svg></div>
          <div>
            <h3>{stats.all}</h3>
            <p>Tổng số báo cáo</p>
          </div>
        </div>
        <div className="report-summary-card success">
          <div className="summary-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4 10-10" /></svg></div>
          <div>
            <h3>{stats.approved}</h3>
            <p>Đã được duyệt</p>
          </div>
        </div>
        <div className="report-summary-card warning">
          <div className="summary-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></svg></div>
          <div>
            <h3>{stats.pending}</h3>
            <p>Chờ duyệt</p>
          </div>
        </div>
        <div className="report-summary-card danger">
          <div className="summary-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 2 20h20L12 3Z" /><path d="M12 8v5" /><path d="M12 16h.01" /></svg></div>
          <div>
            <h3>{stats.rejected}</h3>
            <p>Cần xử lý</p>
          </div>
        </div>
      </div>

      {user?.role !== 'ADMIN' && (
        <div className="card report-list-card">
          <div className="report-filters">
            {[
              ['ALL', 'Tất cả'],
              ['APPROVED', 'Đã duyệt'],
              ['PENDING', 'Chờ duyệt'],
              ['REJECTED', 'Cần sửa'],
            ].map(([value, label]) => (
              <button key={value} type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>

          {loading ? (
            <div className="loading-grid">
              <div className="skeleton" style={{ height: 84, borderRadius: 18 }} />
              <div className="skeleton" style={{ height: 120, borderRadius: 20 }} />
              <div className="skeleton" style={{ height: 120, borderRadius: 20 }} />
            </div>
          ) : filteredWeeklyReports.length === 0 && standaloneReports.length === 0 ? (
            <div className="empty-state-card">
              <p>{showMissingPeriodNotice ? missingPeriodMessage : 'Không tìm thấy mẫu báo cáo tuần nào để nộp.'}</p>
            </div>
          ) : (
            <>
              {filteredWeeklyReports.length > 0 && (
                <div className="weekly-report-list">
                  {filteredWeeklyReports.map((report) => (
                    <article className="weekly-report-card report-card" key={report.id}>
                      <div className="report-card-header">
                        <div className="week-badge">Tuần {report.weekNumber}</div>
                        <div className="report-card-main">
                          <h3>{report.title}</h3>
                          {report.description && <p className="report-card-description">{report.description}</p>}
                          {report.attachmentUrl && (
                            <a className="admin-file-link" href={resolveFileUrl(report.attachmentUrl)} target="_blank" rel="noreferrer">
                              📎 {report.attachmentName || 'Tệp yêu cầu'}
                            </a>
                          )}
                          <div className="report-card-meta">
                            <div className="meta-column">
                              <span className="meta-label">Hạn nộp</span>
                              <span>{report.dueDate ? new Date(report.dueDate).toLocaleDateString('vi-VN') : '-'}</span>
                            </div>
                            <div className="meta-column">
                              <span className="meta-label">Ngày nộp</span>
                              <span>{report.submittedAt ? new Date(report.submittedAt).toLocaleDateString('vi-VN') : '-'}</span>
                              <span className="meta-label">Ngày duyệt</span>
                              <span>{report.submission?.approvedAt ? new Date(report.submission.approvedAt).toLocaleDateString('vi-VN') : '-'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="report-card-actions">
                          <span className={`status-chip status-${getReportStatusMeta(report.submissionStatus).className}`}>
                            <span className="status-icon">
                              {normalizeReportReviewStatus(report.submissionStatus) === 'APPROVED' ? '✓' : normalizeReportReviewStatus(report.submissionStatus) === 'REJECTED' ? '!' : normalizeReportReviewStatus(report.submissionStatus) === 'PENDING' ? '⏳' : '•'}
                            </span>
                            <span>{getReportStatusMeta(report.submissionStatus).label}</span>
                          </span>
                          {report.fileUrl && (
                            <div className="report-file-link" title="Mở file báo cáo">
                              <span className="file-icon">🔗</span>
                              <a href={resolveFileUrl(report.fileUrl)} target="_blank" rel="noreferrer" download={report.fileName || undefined}>Mở / tải tệp</a>
                            </div>
                          )}
                          {getReportScore(report) && (
                            <div className="report-score">
                              <span className="score-icon">★</span>
                              <span>{getReportScore(report)}</span>
                            </div>
                          )}
                          {report.submission && (
                            <button className="btn outline" type="button" onClick={() => openDetailModal(report)}>
                              Xem báo cáo
                            </button>
                          )}
                          <button
                            className="btn outline"
                            type="button"
                            disabled={['PENDING', 'APPROVED'].includes(normalizeReportReviewStatus(report.submissionStatus))}
                            onClick={() => openSubmitModal(report)}
                          >
                            {normalizeReportReviewStatus(report.submissionStatus) === 'APPROVED'
                              ? 'Đã nộp'
                              : normalizeReportReviewStatus(report.submissionStatus) === 'REJECTED'
                                ? 'Sửa và nộp lại'
                                : normalizeReportReviewStatus(report.submissionStatus) === 'PENDING'
                                  ? 'Đang chờ duyệt'
                                  : 'Nộp báo cáo'}
                          </button>
                        </div>
                      </div>

                      {report.reviewerNote && (
                        <div className="mentor-note-box">
                          <strong>Nhận xét từ mentor:</strong>
                          <p>{report.reviewerNote}</p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}

              {standaloneReports.length > 0 && (
                <div className="weekly-report-list">
                  <h3>Báo cáo riêng cho bạn</h3>
                  {standaloneReports.map((report) => (
                    <article className="weekly-report-card report-card" key={`standalone-${report.id}`}>
                      <div className="report-card-header">
                        <div className="report-card-main">
                          <h3>{report.title || `Báo cáo tuần ${report.weekNumber || 'không xác định'}`}</h3>
                          {report.content && <p className="report-card-description">{report.content}</p>}
                          <div className="report-card-meta">
                            <div className="meta-column">
                              <span className="meta-label">Trạng thái</span>
                              <span>{report.status || 'SUBMITTED'}</span>
                            </div>
                            <div className="meta-column">
                              <span className="meta-label">Ngày tạo</span>
                              <span>{report.createdAt ? new Date(report.createdAt).toLocaleDateString('vi-VN') : '-'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="report-card-actions">
                          {report.fileUrl && (
                            <div className="report-file-link" title="Mở file báo cáo">
                              <span className="file-icon">🔗</span>
                              <a href={resolveFileUrl(report.fileUrl)} target="_blank" rel="noreferrer" download={report.fileName || undefined}>Mở / tải tệp</a>
                            </div>
                          )}
                          <button className="btn outline" type="button" onClick={() => openDetailModal(report)}>
                            Xem báo cáo
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {user?.role === 'ADMIN' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3>Mẫu báo cáo tuần</h3>
              <p>Admin tạo sẵn từng tuần, sinh viên sẽ chọn đúng mẫu để nộp file.</p>
            </div>
            <button className="btn" type="button" onClick={openCreateModal}>Tạo tuần mới</button>
          </div>

          {loading ? (
            <div className="loading-grid">
              <div className="skeleton" style={{ height: 86, borderRadius: 18 }} />
              <div className="skeleton" style={{ height: 76, borderRadius: 16 }} />
            </div>
          ) : weeklyReports.length === 0 ? (
            <p>Không thể tìm thấy mẫu báo cáo tuần nào để tạo.</p>
          ) : (
            <div className="weekly-report-list">
              {weeklyReports.map((report) => (
                <article className="weekly-report-card admin-card" key={report.id}>
                  <div className="weekly-report-top">
                    <div>
                      <div className="week-badge">Tuần {report.weekNumber}</div>
                      <h3>{report.title}</h3>
                      <p>{report.description}</p>
                      {report.attachmentUrl && (
                        <a className="admin-file-link" href={resolveFileUrl(report.attachmentUrl)} target="_blank" rel="noreferrer">
                          📎 {report.attachmentName || 'Tệp đính kèm'}
                        </a>
                      )}
                      <div className="weekly-report-meta">
                        <span>Đợt: {periods.find((period) => String(period.id) === String(report.periodId))?.name || report.periodId}</span>
                        {report.dueDate && <span>Hạn nộp: {new Date(report.dueDate).toLocaleDateString('vi-VN')}</span>}
                      </div>
                    </div>
                    <div className="report-card-actions">
                      <span className="status-chip status-done">ACTIVE</span>
                      <button className="btn outline" type="button" onClick={() => handleViewSubmissions(report)}>Xem danh sách nộp</button>
                      <button className="btn outline" type="button" onClick={() => openWeeklyEditModal(report)}>Sửa</button>
                      <button className="btn outline danger" type="button" onClick={() => handleDeleteWeeklyReport(report.id)}>Xóa</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {user?.role === 'ADMIN' && (
        <div className="card admin-review-card">
          <div className="weekly-detail-header">
            <div>
              <h3>{selectedWeeklyDetail ? `Danh sách nộp cho tuần ${selectedWeeklyDetail.weekNumber}` : 'Duyệt báo cáo hàng tuần'}</h3>
              <p>{selectedWeeklyDetail ? `${selectedWeeklyDetail.title}${selectedWeeklyDetail.dueDate ? ` • Hạn nộp ${new Date(selectedWeeklyDetail.dueDate).toLocaleDateString('vi-VN')}` : ''}` : 'Theo dõi và duyệt báo cáo của từng sinh viên cho từng tuần.'}</p>
            </div>
            {selectedWeeklyDetail && (
              <button className="btn outline" type="button" onClick={() => setSelectedWeekId('')}>
                Xem tất cả tuần
              </button>
            )}
          </div>

          <div className="admin-filters">
            <label>
              <span>Chọn tuần</span>
              <select value={selectedWeekId} onChange={(e) => setSelectedWeekId(e.target.value)}>
                <option value="">Tất cả tuần</option>
                {weeklyReports.map((weekly) => (
                  <option key={weekly.id} value={weekly.id}>Tuần {weekly.weekNumber} — {weekly.title}</option>
                ))}
              </select>
            </label>
            <label className="submission-search-field">
              <span>Tìm sinh viên</span>
              <input
                type="search"
                placeholder="Tên, mã sinh viên, nội dung..."
                value={submissionSearch}
                onChange={(event) => setSubmissionSearch(event.target.value)}
              />
            </label>
          </div>

          <div className="submission-stat-grid">
            <div className="submission-stat-card">
              <strong>{submissionStats.total}</strong>
              <span>Tổng nộp</span>
            </div>
            <div className="submission-stat-card pending">
              <strong>{submissionStats.pending}</strong>
              <span>Chờ duyệt</span>
            </div>
            <div className="submission-stat-card approved">
              <strong>{submissionStats.approved}</strong>
              <span>Đã duyệt</span>
            </div>
            <div className="submission-stat-card rejected">
              <strong>{submissionStats.rejected}</strong>
              <span>Bị từ chối</span>
            </div>
          </div>

          <div className="report-filters submission-filters">
            {[
              ['ALL', 'Tất cả'],
              ['POSTED', 'Đã nộp'],
              ['PENDING', 'Chờ duyệt'],
              ['APPROVED', 'Đã duyệt'],
              ['REJECTED', 'Bị từ chối'],
            ].map(([value, label]) => (
              <button key={value} type="button" className={submissionFilter === value ? 'active' : ''} onClick={() => setSubmissionFilter(value)}>
                {label}
              </button>
            ))}
          </div>

          <div className="table-wrapper">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Tuần</th>
                  <th>Sinh viên</th>
                  <th>Nội dung</th>
                  <th>Trạng thái</th>
                  <th>Tệp</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {visibleSubmissionReports.map((report) => (
                  <tr key={`admin-${report.id}`}>
                    <td>{report.weekNumber}</td>
                    <td>{report.Student?.fullName || report.Student?.studentCode || '—'}</td>
                    <td>{report.content?.slice(0, 80)}{report.content?.length > 80 ? '...' : ''}</td>
                    <td><span className={`status-chip status-${getReportStatusMeta(report.status).className}`}>{getReportStatusMeta(report.status).label}</span></td>
                    <td>{report.fileUrl ? <a className="admin-file-link" href={resolveFileUrl(report.fileUrl)} target="_blank" rel="noreferrer" download={report.fileName || undefined}><span className="admin-file-icon">📎</span><span>Mở / tải file</span></a> : '—'}</td>
                    <td>
                      <div className="button-row">
                        <button className="btn" type="button" onClick={() => openSubmissionDrawer(report)}>Xem chi tiết</button>
                        <button className="btn outline" type="button" onClick={() => { setSelectedSubmissionDrawer(report); handleQuickReviewSubmission('APPROVED'); }} disabled={drawerSubmitting}>Duyệt</button>
                        <button className="btn outline danger" type="button" onClick={() => { setSelectedSubmissionDrawer(report); handleQuickReviewSubmission('REJECTED'); }} disabled={drawerSubmitting}>Cần sửa</button>
                        <button className="btn outline" type="button" onClick={() => openAdminEditModal(report)}>Sửa</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleSubmissionReports.length === 0 && (
                  <tr><td colSpan="6">Chưa có sinh viên nộp báo cáo phù hợp với bộ lọc hiện tại.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={`submission-drawer-backdrop ${submissionDrawerOpen ? 'open' : ''}`} onClick={closeSubmissionDrawer}>
        <aside className={`submission-drawer ${submissionDrawerOpen ? 'open' : ''}`} onClick={(event) => event.stopPropagation()}>
          <div className="submission-drawer-header">
            <div>
              <p className="drawer-eyebrow">Submission</p>
              <h3>{selectedSubmissionDrawer?.Student?.fullName || selectedSubmissionDrawer?.Student?.studentCode || 'Chi tiết báo cáo'}</h3>
            </div>
            <button className="modal-close modal-close-text" type="button" onClick={closeSubmissionDrawer}>Đóng</button>
          </div>

          {selectedSubmissionDrawer ? (
            <div className="submission-drawer-body">
              <div className="submission-drawer-card">
                <p><strong>Tuần:</strong> {selectedSubmissionDrawer.weekNumber || selectedSubmissionDrawer.weeklyReportId || '—'}</p>
                <p><strong>Trạng thái:</strong> {getReportStatusMeta(selectedSubmissionDrawer.status).label}</p>
                <p><strong>Mã SV:</strong> {selectedSubmissionDrawer.Student?.studentCode || '—'}</p>
                <p><strong>Ngày nộp:</strong> {selectedSubmissionDrawer.createdAt ? new Date(selectedSubmissionDrawer.createdAt).toLocaleString('vi-VN') : '—'}</p>
              </div>

              <div className="submission-drawer-card">
                <h4>Nội dung</h4>
                <p>{selectedSubmissionDrawer.content || 'Không có nội dung ghi chú.'}</p>
              </div>

              <div className="submission-drawer-card">
                <h4>File đính kèm</h4>
                {selectedSubmissionDrawer.fileUrl ? (
                  <a className="admin-file-link" href={resolveFileUrl(selectedSubmissionDrawer.fileUrl)} target="_blank" rel="noreferrer" download={selectedSubmissionDrawer.fileName || undefined}>
                    <span className="admin-file-icon">📎</span>
                    <span>{selectedSubmissionDrawer.fileName || 'Mở file đính kèm'}</span>
                  </a>
                ) : (
                  <p>Không có file đính kèm.</p>
                )}
              </div>

              <div className="submission-drawer-card">
                <label className="form-field-label">Nhận xét</label>
                <textarea
                  rows="4"
                  value={drawerFeedback}
                  onChange={(event) => setDrawerFeedback(event.target.value)}
                  placeholder="Nhập nhận xét cho sinh viên"
                />
              </div>

              <div className="submission-drawer-card">
                <label className="form-field-label">Điểm</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={drawerScore}
                  onChange={(event) => setDrawerScore(event.target.value)}
                  disabled={drawerStatus !== 'APPROVED'}
                />
              </div>

              <div className="button-row">
                <button className="btn" type="button" onClick={() => { setDrawerStatus('APPROVED'); handleQuickReviewSubmission('APPROVED'); }} disabled={drawerSubmitting}>Đánh dấu đã duyệt</button>
                <button className="btn outline danger" type="button" onClick={() => { setDrawerStatus('REJECTED'); handleQuickReviewSubmission('REJECTED'); }} disabled={drawerSubmitting}>Đánh dấu cần sửa</button>
                <button className="btn outline" type="button" onClick={() => openReviewModal(selectedSubmissionDrawer)}>Chấm đầy đủ</button>
              </div>
            </div>
          ) : (
            <div className="submission-drawer-empty">Chọn một submission để xem chi tiết.</div>
          )}
        </aside>
      </div>

      <Suspense fallback={null}>
        <ReportModal
          open={isModalOpen}
          mode={modalMode}
          weeklyReport={modalMode === 'edit' ? selectedAdminReport : selectedWeeklyReport}
          periods={periods}
          onClose={closeModal}
          onSave={handleSaveAdminReport}
        />
      </Suspense>

      <Suspense fallback={modalFallback}>
        <ReportScoreModal
          open={detailModalOpen}
          report={selectedDetailReport}
          evaluation={selectedDetailEvaluation}
          onClose={closeDetailModal}
        />
      </Suspense>

      <Suspense fallback={modalFallback}>
        <ReviewReportModal
          open={reviewModalOpen}
          report={selectedReviewReport}
          onClose={closeReviewModal}
          onSubmit={handleReviewSubmit}
        />
      </Suspense>
    </div>
  );
}

export default ReportPage;
