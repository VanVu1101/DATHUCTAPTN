function TaskList({tasks}){
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return null;
  }

  const visibleTasks = tasks.slice(0, 4);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3>Nhiệm vụ ưu tiên</h3>
          <p className="card-subtitle">Những việc cần tập trung trong tuần</p>
        </div>
        <span className="section-chip">Ưu tiên</span>
      </div>
      <ul className="task-list">
        {visibleTasks.map((t) => {
          const normalizedPriority = String(t.priority || '').toLowerCase();
          const priorityClass = normalizedPriority.includes('cao') ? 'cao' : normalizedPriority.includes('tb') ? 'tb' : 'thap';

          return (
            <li key={t.id} className="task-item">
              <div className="left">
                <span className={`dot ${t.status === 'Hoàn thành' ? 'green' : 'brown'}`}></span>
                <div className="task-main">
                  <div className="task-title">{t.internshipId ? <a href={`/evaluations?internshipId=${t.internshipId}`}>{t.title}</a> : t.title}</div>
                  <div className="task-meta">{t.badge} · Còn {t.days} ngày</div>
                </div>
              </div>
              <div className="right">
                <div className={`priority ${priorityClass}`}>{t.priority}</div>
                <div className="date">{t.date}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default TaskList;
