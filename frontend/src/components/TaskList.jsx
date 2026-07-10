function TaskList({tasks}){
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Nhiệm vụ đang thực hiện</h3>
        <a href="#">Tất cả →</a>
      </div>
      <ul className="task-list">
        {tasks.map(t=> (
          <li key={t.id} className="task-item">
            <div className="left">
              <span className={`dot ${t.status==='Đang làm'?'green':'brown'}`}></span>
              <div className="task-main">
                <div className="task-title">{t.internshipId ? <a href={`/evaluations?internshipId=${t.internshipId}`}>{t.title}</a> : t.title}</div>
                <div className="task-meta">{t.badge} · Còn {t.days} ngày</div>
              </div>
            </div>
            <div className="right">
              <div className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</div>
              <div className="date">{t.date}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TaskList;
