const VALID_REPORT_STATUSES = ['DRAFT', 'SUBMITTED', 'REVIEWED', 'REJECTED'];

const normalizeReportStatus = (status) => {
  const normalized = String(status || '').trim().toUpperCase();
  const compact = normalized.replace(/[^A-Z]/g, '');

  if (normalized === 'APPROVED' || compact === 'APPROVED') return 'REVIEWED';
  if (['PENDING', 'SUBMITTED', 'WAITING', 'WAIT', 'REVIEW'].includes(normalized) || compact === 'PENDING' || compact === 'SUBMITTED' || compact === 'WAITING' || compact === 'WAIT' || compact === 'REVIEW') return 'SUBMITTED';
  if (['NEEDS_REVISION', 'NEEDS_REVISON', 'NEEDSREVISON', 'NEEDSREVISION'].includes(normalized) || compact === 'NEEDSREVISION') return 'REJECTED';

  if (VALID_REPORT_STATUSES.includes(normalized)) return normalized;
  return 'SUBMITTED';
};

const getReportStatusLabel = (status) => {
  switch (normalizeReportStatus(status)) {
    case 'DRAFT': return 'Bản nháp';
    case 'SUBMITTED': return 'Chờ duyệt';
    case 'REVIEWED': return 'Đã duyệt';
    case 'REJECTED': return 'Cần sửa';
    default: return 'Chờ duyệt';
  }
};

module.exports = { VALID_REPORT_STATUSES, normalizeReportStatus, getReportStatusLabel };
