import React from 'react';

function AppFormField({ label, error, children, hint }) {
  return (
    <label className="app-form-field">
      {label ? <span className="app-form-label">{label}</span> : null}
      {children}
      {hint ? <span className="app-form-hint">{hint}</span> : null}
      {error ? <span className="app-form-error">{error}</span> : null}
    </label>
  );
}

export default AppFormField;
