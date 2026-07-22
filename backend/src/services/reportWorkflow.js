const VALID_REPORT_STATUSES = ['DRAFT', 'SUBMITTED', 'REVIEWED', 'REJECTED'];

const normalizeReportStatus = (status) => {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'APPROVED') return 'REVIEWED';
  if (normalized === 'PENDING') return 'DRAFT';
  if (VALID_REPORT_STATUSES.includes(normalized)) return normalized;
  return 'DRAFT';
};

const getReportStatusLabel = (status) => {
  switch (normalizeReportStatus(status)) {
    case 'DRAFT': return 'Bản nháp';
    case 'SUBMITTED': return 'Đã nộp';
    case 'REVIEWED': return 'Đã duyệt';
    case 'REJECTED': return 'Cần chỉnh sửa';
    default: return 'Bản nháp';
  }
};

module.exports = { VALID_REPORT_STATUSES, normalizeReportStatus, getReportStatusLabel };
