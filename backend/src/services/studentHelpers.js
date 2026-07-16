const filterStudentRecords = (students = []) => {
  if (!Array.isArray(students)) return [];

  return students.filter((student) => {
    const role = student?.User?.role || student?.role;
    return role === 'STUDENT';
  });
};

const shouldCreateStudentProfile = (user = {}) => {
  const role = String(user?.role || '').toUpperCase();
  return role === 'STUDENT';
};

module.exports = {
  filterStudentRecords,
  shouldCreateStudentProfile
};
