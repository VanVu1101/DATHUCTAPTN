function ConfirmDialog({ open, title, message, confirmLabel = 'Xác nhận', cancelLabel = 'Hủy', onConfirm, onCancel, variant = 'danger' }) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="confirm-dialog">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="btn btn-secondary" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`} type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
