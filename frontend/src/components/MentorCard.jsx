import { useNavigate } from 'react-router-dom';

function MentorCard({ mentor }) {
  const navigate = useNavigate();

  if (!mentor) {
    return null;
  }

  const initials = mentor.name
    ? mentor.name.split(' ').slice(-2).map((part) => part[0]).join('').toUpperCase()
    : 'HD';

  return (
    <div className="card mentor-card">
      <h3>Người hướng dẫn</h3>
      <div className="mentor-row">
        {mentor.avatar ? (
          <img src={mentor.avatar} alt="" className="mentor-avatar" />
        ) : (
          <div className="mentor-avatar mentor-avatar--fallback">{initials}</div>
        )}
        <div>
          <div className="mentor-name">{mentor.name}</div>
          <div className="mentor-role">{mentor.role}</div>
        </div>
      </div>
      <div className="mentor-actions">
        <button type="button" className="btn" onClick={() => navigate('/checkin')}>
          Lịch họp
        </button>
        <button type="button" className="btn outline" onClick={() => navigate('/chat')}>
          Nhắn tin
        </button>
      </div>
    </div>
  );
}

export default MentorCard;
