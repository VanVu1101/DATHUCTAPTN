import { useEffect, useMemo, useState } from 'react';
import { createWeeklyReport, submitReport, updateWeeklyReport } from '../services/reportService';

const createInitialState = (periodId = '') => ({
  periodId,
  weekNumber: '',
  title: '',
  description: '',
  dueDate: '',
  status: 'SUBMITTED',
  reviewerNote: ''
});

function ReportModal({ open, onClose, mode = 'submit', weeklyReport = null, periods = [], onSave }) {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [file, setFile] = useState(null);
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState(createInitialState(periods[0]?.id ? String(periods[0].id) : ''));

  useEffect(() => {
    if (!open) {
      setMessage('');
      setStatus('');
      setPreview(null);
      setFile(null);
      setContent('');
      setForm(createInitialState(periods[0]?.id ? String(periods[0].id) : ''));
      return;
    }

    if (mode === 'create') {
      setForm(createInitialState(periods[0]?.id ? String(periods[0].id) : ''));
      setContent('');
      setFile(null);
    } else if (mode === 'edit-weekly' && weeklyReport) {
      setForm({
        periodId: String(weeklyReport.periodId || ''),
        weekNumber: weeklyReport.weekNumber || '',
        title: weeklyReport.title || '',
        description: weeklyReport.description || '',
        dueDate: weeklyReport.dueDate ? String(weeklyReport.dueDate).slice(0, 10) : '',
        status: weeklyReport.status || 'ACTIVE',
        reviewerNote: '',
      });
      setFile(null);
    } else if (mode === 'submit') {
      setForm(createInitialState(periods[0]?.id ? String(periods[0].id) : ''));
      setContent(weeklyReport?.submission?.content || '');
      setFile(null);
    } else if (mode === 'edit' && weeklyReport) {
      setForm({
        periodId: weeklyReport.periodId ? String(weeklyReport.periodId) : (periods[0]?.id ? String(periods[0].id) : ''),
        weekNumber: weeklyReport.weekNumber || '',
        title: weeklyReport.title || '',
        description: weeklyReport.description || '',
        dueDate: weeklyReport.dueDate ? weeklyReport.dueDate.slice(0, 10) : '',
        status: weeklyReport.status || 'SUBMITTED',
        reviewerNote: weeklyReport.reviewerNote || ''
      });
      setContent(weeklyReport.content || '');
      setFile(null);
    }
  }, [open, mode, weeklyReport, periods]);

  const title = useMemo(() => {
    if (mode === 'create') return 'Tạo báo cáo tuần mới';
    if (mode === 'edit-weekly') return 'Sửa tuần báo cáo';
    if (mode === 'edit') return 'Sửa báo cáo admin';
    if (!weeklyReport) return 'Nộp báo cáo mới';
    return 'Nộp báo cáo tuần';
  }, [mode, weeklyReport]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      if (mode === 'create') {
        const payload = new FormData();
        payload.append('periodId', String(form.periodId));
        payload.append('weekNumber', String(form.weekNumber));
        payload.append('title', form.title);
        payload.append('description', form.description);
        if (form.dueDate) payload.append('dueDate', form.dueDate);
        if (file) payload.append('file', file);
        const res = await createWeeklyReport(payload);
        if (res?.success) {
          setStatus('success');
          setMessage(res.message || 'Tạo tuần báo cáo thành công.');
          window.setTimeout(onClose, 700);
        } else {
          setStatus('error');
          setMessage(res?.message || 'Không thể tạo báo cáo tuần');
        }
        return;
      }

      if (mode === 'edit-weekly') {
        const payload = new FormData();
        payload.append('periodId', String(form.periodId));
        payload.append('weekNumber', String(form.weekNumber));
        payload.append('title', form.title);
        payload.append('description', form.description);
        if (form.dueDate) payload.append('dueDate', form.dueDate);
        if (file) payload.append('file', file);
        const res = await updateWeeklyReport(weeklyReport.id, payload);
        if (res?.success) {
          setStatus('success');
          setMessage('Đã cập nhật tuần báo cáo.');
          window.setTimeout(onClose, 700);
        }
        return;
      }

      if (mode === 'edit') {
        if (!onSave) {
          setStatus('error');
          setMessage('Không có hàm lưu.');
          return;
        }

        const payload = {
          content,
          status: form.status,
          reviewerNote: form.reviewerNote,
        };

        await onSave(payload);
        return;
      }

      const payload = new FormData();
      if (weeklyReport) {
        payload.append('weeklyReportId', String(weeklyReport.id));
        payload.append('weekNumber', String(weeklyReport.weekNumber));
      } else {
        if (!form.weekNumber) {
          setStatus('error');
          setMessage('Vui lòng nhập số tuần báo cáo.');
          return;
        }
        payload.append('weekNumber', String(form.weekNumber));
        if (form.title) payload.append('title', form.title);
        if (form.description) payload.append('description', form.description);
      }
      payload.append('content', content);
      if (file) payload.append('file', file);
      const res = await submitReport(payload);
      if (res?.success) {
        setStatus('success');
        setMessage('Báo cáo đã được nộp và đang chờ duyệt.');
        setPreview({
          weekNumber: weeklyReport?.weekNumber || form.weekNumber,
          title: weeklyReport?.title || form.title,
          date: new Date().toLocaleDateString('vi-VN')
        });
      } else {
        setStatus('error');
        setMessage(res?.message || 'Không thể nộp báo cáo');
      }
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.message || (mode === 'create' ? 'Lỗi khi tạo báo cáo tuần' : mode === 'edit' ? 'Lỗi khi lưu báo cáo' : 'Lỗi khi nộp báo cáo'));
    }
  };

  const handleCreateChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          {mode === 'create' || mode === 'edit-weekly' ? (
            <>
              <label className="profile-field">
                <span>Đợt thực tập</span>
                <select name="periodId" value={form.periodId} onChange={handleCreateChange} required>
                  <option value="">Chọn đợt thực tập</option>
                  {periods.map((period) => (
                    <option key={period.id} value={period.id}>{period.name}</option>
                  ))}
                </select>
              </label>
              <label className="profile-field">
                <span>Tuần số</span>
                <input type="number" min="1" name="weekNumber" placeholder="Tuần số" value={form.weekNumber} onChange={handleCreateChange} required />
              </label>
              <label className="profile-field">
                <span>Tiêu đề báo cáo</span>
                <input type="text" name="title" placeholder="Tiêu đề báo cáo" value={form.title} onChange={handleCreateChange} required />
              </label>
              <label className="profile-field">
                <span>Mô tả yêu cầu</span>
                <textarea rows="5" name="description" placeholder="Mô tả yêu cầu báo cáo" value={form.description} onChange={handleCreateChange} required />
              </label>
              <label className="profile-field">
                <span>Hạn nộp (tuỳ chọn)</span>
                <input type="date" min={new Date().toISOString().slice(0, 10)} name="dueDate" value={form.dueDate} onChange={handleCreateChange} />
              </label>
              <label className="profile-field">
                <span>Tệp yêu cầu (tuỳ chọn)</span>
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
            </>
          ) : mode === 'edit' ? (
            <>
              <div className="report-modal-summary">
                <p><strong>Tuần:</strong> {form.weekNumber}</p>
                <p><strong>Trạng thái hiện tại:</strong> {form.status}</p>
              </div>
              <label className="profile-field">
                <span>Nội dung báo cáo</span>
                <textarea rows="6" placeholder="Nội dung báo cáo" value={content} onChange={(e) => setContent(e.target.value)} required />
              </label>
              <label className="profile-field">
                <span>Trạng thái</span>
                <select name="status" value={form.status} onChange={handleCreateChange}>
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </label>
              <label className="profile-field">
                <span>Ghi chú reviewer</span>
                <textarea rows="4" name="reviewerNote" value={form.reviewerNote} onChange={handleCreateChange} placeholder="Nhập ghi chú cho báo cáo" />
              </label>
              {weeklyReport?.fileUrl && (
                <div className="form-note">
                  <strong>File hiện tại:</strong> <a href={weeklyReport.fileUrl} target="_blank" rel="noreferrer">{weeklyReport.fileName || 'Xem file'}</a>
                </div>
              )}
            </>
          ) : (
            <>
              {!weeklyReport ? (
                <p className="form-note">Admin chưa tạo tuần báo cáo khả dụng.</p>
              ) : (
                <>
                  <div className="report-modal-summary">
                    <p><strong>Tuần {weeklyReport?.weekNumber}:</strong> {weeklyReport?.title}</p>
                    <p>{weeklyReport?.description}</p>
                    {weeklyReport?.dueDate && <p><strong>Hạn nộp:</strong> {new Date(weeklyReport.dueDate).toLocaleDateString('vi-VN')}</p>}
                  </div>
                </>
              )}
              <label className="profile-field">
                <span>Nội dung báo cáo</span>
                <textarea rows="6" placeholder="Ghi chú ngắn cho báo cáo (không bắt buộc)" value={content} onChange={(e) => setContent(e.target.value)} />
              </label>
              <label className="profile-field">
                <span>Đính kèm file</span>
                <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
              <small className="form-note">Bạn có thể chọn bất kỳ loại tệp nào để nộp báo cáo.</small>
            </>
          )}

          <div className="button-row">
            <button className="btn" type="submit">{mode === 'create' ? 'Tạo tuần báo cáo' : mode === 'edit-weekly' || mode === 'edit' ? 'Lưu thay đổi' : 'Nộp báo cáo'}</button>
            <button type="button" className="btn outline" onClick={onClose}>Hủy</button>
          </div>
        </form>

        {message && <p className={`form-message ${status === 'error' ? 'error' : 'success'}`}>{message}</p>}

        {preview && (
          <div className="report-preview">
            <h4>{mode === 'create' ? 'Xem trước tuần báo cáo' : 'Xác nhận đã nộp'}</h4>
            <p><strong>Tuần:</strong> {preview.weekNumber}</p>
            {preview.title && <p><strong>Tiêu đề:</strong> {preview.title}</p>}
            <p><strong>Ngày tạo:</strong> {preview.date}</p>
            {mode === 'submit' && <div className="preview-box">{content}</div>}
            {file && mode === 'submit' && <p><strong>Tệp đính kèm:</strong> {file.name}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportModal;
