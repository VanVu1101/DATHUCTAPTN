import React from 'react';

export default function ReportScoreModal({ open, report, evaluation, onClose }) {
  if (!open || !report) return null;

  const status = report.status || report.submissionStatus || 'UNKNOWN';
  const title = report.title || `Báo cáo tuần ${report.weekNumber || 'N/A'}`;
  const description = report.description || report.summary || '';
  const submittedAt = report.createdAt || report.submission?.createdAt || null;
  const approvedAt = report.submission?.approvedAt || report.updatedAt || null;
  const fileUrl = report.fileUrl || report.submission?.fileUrl || '';
  const score = evaluation?.score ?? report.score ?? report.submission?.score ?? null;
  const feedback = evaluation?.feedback ?? report.reviewerNote ?? report.submission?.reviewerNote ?? 'Không có nhận xét';

  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const filledStars = score != null ? Math.min(5, Math.floor(Number(score) / 2)) : 0;
  const starItems = Array.from({ length: 5 }, (_, idx) => (
    <span key={idx} className={idx < filledStars ? 'report-star report-star-filled' : 'report-star report-star-empty'}>
      ★
    </span>
  ));

  const statusText = status === 'APPROVED' ? 'Đã duyệt' : status === 'REJECTED' ? 'Từ chối' : 'Chưa nộp';

  return (
    <div className="report-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
      <div className="report-score-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <div className="report-modal-badges">
            <span className="report-badge report-badge-week">Tuần {report.weekNumber || 'N/A'}</span>
            <span className="report-badge report-badge-status">
              <span className="report-badge-icon" aria-hidden="true">✔</span>
              {statusText}
            </span>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Đóng">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-close">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="report-modal-divider" />

        <div className="report-modal-content">
          <h2 id="report-modal-title" className="report-modal-title">{title}</h2>
          {description ? <p className="report-modal-description">{description}</p> : null}

          <div className="report-info-grid">
            <div className="report-info-card">
              <p className="report-info-label">Ngày nộp</p>
              <p className="report-info-value">{formatDate(submittedAt)}</p>
            </div>
            <div className="report-info-card">
              <p className="report-info-label">Ngày duyệt</p>
              <p className="report-info-value">{formatDate(approvedAt)}</p>
            </div>
          </div>

          <div className="report-score-card">
            <div className="report-score-label">Điểm số</div>
            <div className="report-score-row">
              <div className="report-star-row">{starItems}</div>
              <div className="report-score-value">{score != null ? score.toFixed(1) : '—'}/10</div>
            </div>
          </div>

          <div className="report-review-card">
            <div className="report-review-header">Nhận xét của người hướng dẫn</div>
            <p className="report-review-body">{feedback}</p>
          </div>

          <div className="report-modal-footer">
            {fileUrl ? (
              <a
                href={`http://localhost:5000${fileUrl}`}
                target="_blank"
                rel="noreferrer"
                className="report-button report-button-primary"
              >
                <span className="report-button-icon" aria-hidden="true">⬇</span>
                Tải PDF
              </a>
            ) : (
              <button type="button" className="report-button report-button-primary" disabled>
                <span className="report-button-icon" aria-hidden="true">⬇</span>
                Tải PDF
              </button>
            )}
            <button type="button" className="report-button report-button-secondary" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
