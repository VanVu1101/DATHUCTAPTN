import Breadcrumbs from './Breadcrumbs';

function PageHeader({ title, description, actions, compact = false, icon }) {
  return (
    <section className={`page-header-card${compact ? ' compact' : ''}`}>
      <div className="page-header-content">
        <Breadcrumbs />
        <div className="page-header-title-row">
          {icon ? <span className="page-header-icon" aria-hidden="true">{icon}</span> : null}
          <h1>{title}</h1>
        </div>
        {description && <p>{description}</p>}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </section>
  );
}

export default PageHeader;
