import React from 'react';

function AppButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  className = '',
  children,
  type = 'button',
  icon,
  iconPosition = 'left',
  disabled = false,
  ...rest
}) {
  const variantClass = {
    primary: 'app-btn-primary',
    secondary: 'app-btn-secondary',
    outline: 'app-btn-outline',
    ghost: 'app-btn-ghost',
    danger: 'app-btn-danger',
  }[variant] || 'app-btn-primary';

  const sizeClass = {
    sm: 'app-btn-sm',
    md: 'app-btn-md',
    lg: 'app-btn-lg',
  }[size] || 'app-btn-md';

  const isDisabled = loading || disabled;
  const classes = ['app-btn', variantClass, sizeClass, fullWidth ? 'app-btn-full' : '', className].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      {...rest}
    >
      {loading ? <span className="app-btn-spinner" aria-hidden="true" /> : null}
      {!loading && icon && iconPosition === 'left' ? <span className="app-btn-icon" aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' ? <span className="app-btn-icon" aria-hidden="true">{icon}</span> : null}
    </button>
  );
}

export default AppButton;
