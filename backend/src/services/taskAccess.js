const canManageTask = (role, assignedMentorId = null) => {
  if (role === 'ADMIN') return true;
  if (role === 'MENTOR') return true;
  return false;
};

const canSubmitTask = (role) => role === 'STUDENT';

module.exports = { canManageTask, canSubmitTask };
