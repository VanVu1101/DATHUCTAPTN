import React, { useMemo, useState } from 'react';

export default function ReviewReportModal({ open, report, onClose, onSubmit }) {
  const [status, setStatus] = useState('APPROVED');
  const [score, setScore] = useState('8.0');
  const [feedback, setFeedback] = useState('');

  const visibleReport = useMemo(() => report || {}, [report]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!onSubmit) return;

    const payload = {
      status,
      reviewerNote: feedback,
    };

    if (status === 'APPROVED') {
      const scoreValue = Number(score);
      if (!Number.isNaN(scoreValue)) {
        payload.score = scoreValue;
      }
      if (feedback) payload.feedback = feedback;
    }

    await onSubmit(payload);
  };

  if (!open || !report) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Chấm báo cáo</h3>
            <p className="report-modal-description">{report.title || `Báo cáo tuần ${report.weekNumber || report.weeklyReportId || 'n/a'}`}</p>
          </div>
          <button className="modal-close modal-close-text" onClick={onClose}>Đóng</button>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          {report.description && (
            <div className="review-report-summary">
              <p><strong>Tiêu đề:</strong> {report.title}</p>
              <p><strong>Mô tả:</strong> {report.description}</p>
            </div>
          )}

          <div className="review-report-summary">
            <p><strong>Nội dung:</strong> {visibleReport.content ? `${visibleReport.content.slice(0, 120)}...` : 'Không có nội dung'}</p>
            <p><strong>Trạng thái hiện tại:</strong> {visibleReport.status || 'CHƯA NỘP'}</p>
          </div>

          <div className="form-field">
            <label>Trạng thái duyệt</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Cần sửa</option>
            </select>
          </div>

          <div className="form-field">
            <label>Điểm</label>
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              disabled={status !== 'APPROVED'}
            />
          </div>

          <div className="form-field">
            <label>Nhận xét / feedback</label>
            <textarea
              rows="4"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Nhập nhận xét cho sinh viên"
            />
          </div>

          <div className="button-row">
            <button className="btn" type="submit">Lưu chấm</button>
            <button type="button" className="btn outline" onClick={onClose}>Đóng</button>
          </div>
        </form>
      </div>
    </div>
  );
}
