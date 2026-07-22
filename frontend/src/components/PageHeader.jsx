import Breadcrumbs from './Breadcrumbs';

function PageHeader({ title, description, actions, compact = false }) {
  return (
    <section className={`page-header-card${compact ? ' compact' : ''}`}>
      <div className="page-header-content">
        <Breadcrumbs />
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </section>
  );
}

export default PageHeader;
