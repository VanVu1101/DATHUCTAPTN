function ActivityList({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <div className="card">
      <h3>Hoạt động gần đây</h3>
      <ul className="activity-list">
        {items.map((it, idx) => (
          <li key={idx} className="activity-item">
            <div className={`act-icon ${it.color || ''}`}>{it.icon}</div>
            <div className="act-main">
              <div className="act-title">{it.title}</div>
              <div className="act-meta">{it.time}</div>
            </div>
            {it.note && <div className="act-note">{it.note}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ActivityList;
