import '../App.css';
import { useEffect, useMemo, useState } from 'react';
import ReportModal from '../components/ReportModal';
import ReportScoreModal from '../components/ReportScoreModal';
import ReviewReportModal from '../components/ReviewReportModal';
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

const resolveFileUrl = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const apiOrigin = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  return `${apiOrigin}${value.startsWith('/') ? '' : '/'}${value}`;
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
  const [selectedReviewReport, setSelectedReviewReport] = useState(null);
  const [selectedAdminReport, setSelectedAdminReport] = useState(null);
  const [modalMode, setModalMode] = useState('submit');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [filter, setFilter] = useState('ALL');
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
      closeReviewModal();
      loadReports();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Không duyệt được báo cáo.');
    }
  };

  const handleDeleteWeeklyReport = async (reportId) => {
    if (!window.confirm('Xóa tuần báo cáo này?')) return;
    try {
      await deleteWeeklyReport(reportId);
      setMessage('Đã xóa tuần báo cáo.');
      loadReports();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Xóa tuần báo cáo thất bại.');
    }
  };

  const openReviewModal = (report) => {
    setSelectedReviewReport(report);
    setReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setReviewModalOpen(false);
    setSelectedReviewReport(null);
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
    if (filter === 'DONE') return weeklyReports.filter((item) => ['SUBMITTED', 'APPROVED', 'REJECTED'].includes(item.submissionStatus));
    if (filter === 'APPROVED') return weeklyReports.filter((item) => item.submissionStatus === 'APPROVED');
    if (filter === 'PENDING') return weeklyReports.filter((item) => item.submissionStatus === 'SUBMITTED');
    if (filter === 'REJECTED') return weeklyReports.filter((item) => item.submissionStatus === 'REJECTED');
    return weeklyReports;
  }, [filter, weeklyReports]);

  const standaloneReports = useMemo(() => {
    const reports = userReports.filter((report) => !report.weeklyReportId);
    if (filter === 'ALL') return reports;
    if (filter === 'APPROVED') return reports.filter((report) => report.status === 'APPROVED');
    if (filter === 'PENDING') return reports.filter((report) => report.status === 'SUBMITTED');
    if (filter === 'REJECTED') return reports.filter((report) => report.status === 'REJECTED');
    return reports;
  }, [userReports, filter]);

  const showMissingPeriodNotice = !loading && !weeklyReports.length && standaloneReports.length === 0 && user?.role !== 'ADMIN';
  const missingPeriodMessage = profile?.periodId
    ? 'Không tìm thấy mẫu báo cáo tuần nào để nộp.'
    : 'Vui lòng chọn kỳ thực tập trong hồ sơ để xem báo cáo tuần phù hợp.';

  const stats = useMemo(() => {
    const all = weeklyReports.length + standaloneReports.length;
    const approved = [...weeklyReports, ...standaloneReports].filter((item) => item.submissionStatus === 'APPROVED' || item.status === 'APPROVED').length;
    const pending = [...weeklyReports, ...standaloneReports].filter((item) => item.submissionStatus === 'SUBMITTED' || item.status === 'SUBMITTED').length;
    const rejected = [...weeklyReports, ...standaloneReports].filter((item) => item.submissionStatus === 'REJECTED' || item.status === 'REJECTED').length;
    return { all, approved, pending, rejected };
  }, [weeklyReports, standaloneReports]);


  return (
    <div className="page-shell report-page">
      <div className="card report-hero">
        <div className="card-header report-hero-header">
          <div>
            <h1>Báo cáo tiến độ</h1>
            <p>{user?.role === 'ADMIN' ? 'Admin tạo báo cáo tuần, sinh viên nộp file theo từng tuần.' : 'Chọn đúng báo cáo tuần để nộp file và theo dõi trạng thái.'}</p>
          </div>
          {user?.role === 'ADMIN' ? (
            <button className="btn primary report-create-btn" onClick={openCreateModal}>+ Tạo báo cáo mới</button>
          ) : (
            <div className="report-legend">Bấm vào tuần để nộp file</div>
          )}
        </div>
      </div>

      {message && <div className="info-card"><p>{message}</p></div>}

      <div className="report-summary-grid">
        <div className="report-summary-card">
          <div className="summary-icon">📄</div>
          <div>
            <h3>{stats.all}</h3>
            <p>Tổng số báo cáo</p>
          </div>
        </div>
        <div className="report-summary-card success">
          <div className="summary-icon">✅</div>
          <div>
            <h3>{stats.approved}</h3>
            <p>Đã được duyệt</p>
          </div>
        </div>
        <div className="report-summary-card warning">
          <div className="summary-icon">⏳</div>
          <div>
            <h3>{stats.pending}</h3>
            <p>Chờ duyệt</p>
          </div>
        </div>
        <div className="report-summary-card danger">
          <div className="summary-icon">⚠️</div>
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
            <p>Đang tải...</p>
          ) : filteredWeeklyReports.length === 0 && standaloneReports.length === 0 ? (
            <>
              <p>{showMissingPeriodNotice ? missingPeriodMessage : 'Không tìm thấy mẫu báo cáo tuần nào để nộp.'}</p>
            </>
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
                          <span className={`status-chip status-${report.submissionStatus === 'APPROVED' ? 'done' : report.submissionStatus === 'REJECTED' ? 'danger' : report.submissionStatus === 'SUBMITTED' ? 'warning' : 'neutral'}`}>
                            <span className="status-icon">
                              {report.submissionStatus === 'APPROVED' ? '✓' : report.submissionStatus === 'REJECTED' ? '!' : report.submissionStatus === 'SUBMITTED' ? '⏳' : '•'}
                            </span>
                            <span>
                              {report.submissionStatus === 'APPROVED'
                                ? 'Đã duyệt'
                                : report.submissionStatus === 'REJECTED'
                                  ? 'Cần sửa'
                                  : report.submissionStatus === 'SUBMITTED'
                                    ? 'Chờ duyệt'
                                    : 'Chưa nộp'}
                            </span>
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
                            disabled={['SUBMITTED', 'APPROVED'].includes(report.submissionStatus)}
                            onClick={() => openSubmitModal(report)}
                          >
                            {report.submissionStatus === 'APPROVED'
                              ? 'Đã nộp'
                              : report.submissionStatus === 'REJECTED'
                                ? 'Sửa và nộp lại'
                                : report.submissionStatus === 'SUBMITTED'
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
            <p>Đang tải...</p>
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
          <h3>Duyệt báo cáo hàng tuần</h3>
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
                {allReports.map((report) => (
                  <tr key={`admin-${report.id}`}>
                    <td>{report.weekNumber}</td>
                    <td>{report.Student?.fullName || report.Student?.studentCode || '—'}</td>
                    <td>{report.content?.slice(0, 80)}{report.content?.length > 80 ? '...' : ''}</td>
                    <td><span className={`status-chip status-${report.status === 'APPROVED' ? 'done' : report.status === 'REJECTED' ? 'danger' : report.status === 'SUBMITTED' ? 'warning' : 'neutral'}`}>{report.status === 'APPROVED' ? 'Đã duyệt' : report.status === 'REJECTED' ? 'Từ chối' : report.status === 'SUBMITTED' ? 'Chờ duyệt' : 'Chưa'}</span></td>
                    <td>{report.fileUrl ? <a className="admin-file-link" href={resolveFileUrl(report.fileUrl)} target="_blank" rel="noreferrer" download={report.fileName || undefined}><span className="admin-file-icon">📎</span><span>Mở / tải file</span></a> : '—'}</td>
                    <td>
                      <div className="button-row">
                        <button className="btn" type="button" onClick={() => openReviewModal(report)}>Chấm báo cáo</button>
                        <button className="btn outline" type="button" onClick={() => openAdminEditModal(report)}>Sửa</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {allReports.length === 0 && (
                  <tr><td colSpan="6">Chưa có sinh viên nộp báo cáo cho tuần đã chọn.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ReportModal
        open={isModalOpen}
        mode={modalMode}
        weeklyReport={modalMode === 'edit' ? selectedAdminReport : selectedWeeklyReport}
        periods={periods}
        onClose={closeModal}
        onSave={handleSaveAdminReport}
      />

      <ReportScoreModal
        open={detailModalOpen}
        report={selectedDetailReport}
        evaluation={selectedDetailEvaluation}
        onClose={closeDetailModal}
      />

      <ReviewReportModal
        open={reviewModalOpen}
        report={selectedReviewReport}
        onClose={closeReviewModal}
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
}

export default ReportPage;
