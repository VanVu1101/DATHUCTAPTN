function Sparkline({points = [], width = 100, height = 28, stroke = '#3b82f6'}){
  if (!points || points.length === 0) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const norm = points.map((p) => (max === min ? 0.5 : (p - min) / (max - min)));
  const step = width / Math.max(1, points.length - 1);
  const path = norm.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${height - v * height}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ title, value, subtitle, icon, variant = 'small', sparkline }) {
  return (
    <div className={`stat-card ${variant}`}>
      {icon && <div className="stat-icon">{icon}</div>}
      <div className="stat-body">
        <div className="stat-top">
          <h3 className="stat-value">{value}</h3>
          <div className="stat-title">{title}</div>
        </div>
        {subtitle && <div className="stat-sub">{subtitle}</div>}
        {sparkline && <div className="stat-sparkline"><Sparkline points={sparkline} /></div>}
      </div>
    </div>
  );
}

export default StatCard;
