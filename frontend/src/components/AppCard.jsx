import React from 'react';

function AppCard({ title, subtitle, actions, children, className = '', compact = false, icon }) {
  return (
    <section className={`app-card${compact ? ' app-card-compact' : ''} ${className}`.trim()}>
      {(title || subtitle || actions) && (
        <div className="app-card-header">
          <div className="app-card-heading">
            {icon ? <span className="app-card-icon" aria-hidden="true">{icon}</span> : null}
            <div>
              {title ? <h3>{title}</h3> : null}
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
          </div>
          {actions ? <div className="app-card-actions">{actions}</div> : null}
        </div>
      )}
      <div className="app-card-body">{children}</div>
    </section>
  );
}

export default AppCard;
