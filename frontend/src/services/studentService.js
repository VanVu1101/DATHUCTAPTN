import apiClient from '../api/client';

export const persistProfile = (profile) => {
  if (!profile) return null;
  try {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const nextUser = {
      ...currentUser,
      ...profile,
      profileImageUrl: profile.profileImageUrl || profile.avatar || currentUser.profileImageUrl || currentUser.avatar || '',
      avatar: profile.avatar || profile.profileImageUrl || currentUser.avatar || currentUser.profileImageUrl || '',
      fullName: profile.fullName || currentUser.fullName || currentUser.name || '',
      role: profile.role || currentUser.role || 'STUDENT',
    };
    localStorage.setItem('user', JSON.stringify(nextUser));
    return nextUser;
  } catch (error) {
    return null;
  }
};

export const getStoredProfile = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch (error) {
    return null;
  }
};

export const getMyProfile = async () => {
  const res = await apiClient.get('/students/profile');
  return res.data;
};

export const updateMyProfile = async (payload) => {
  const res = await apiClient.put('/students/profile', payload);
  return res.data;
};

export const getMyProfileDocuments = async () => {
  const res = await apiClient.get('/students/profile/documents');
  return res.data;
};

export const uploadProfileDocument = async (formData) => {
  const res = await apiClient.post('/students/profile/documents', formData);
  return res.data;
};

export const deleteProfileDocument = async (documentId) => {
  const res = await apiClient.delete(`/students/profile/documents/${documentId}`);
  return res.data;
};

export const uploadProfileImage = async (formData) => {
  const res = await apiClient.post('/students/profile/image', formData);
  return res.data;
};

export const getStudents = async (params = {}) => {
  const res = await apiClient.get('/students', { params });
  return res.data;
};

export const createStudent = async (payload) => {
  const res = await apiClient.post('/students', payload);
  return res.data;
};

export const updateStudent = async (id, payload) => {
  const res = await apiClient.put(`/students/${id}`, payload);
  return res.data;
};

export const deleteStudent = async (id) => {
  const res = await apiClient.delete(`/students/${id}`);
  return res.data;
};

export const assignStudentPeriod = async (id, periodId) => {
  const res = await apiClient.put(`/students/${id}/assign-period`, { periodId });
  return res.data;
};

export const assignStudentMentor = async (id, mentorId, mentorName) => {
  const res = await apiClient.put(`/students/${id}/assign-mentor`, { mentorId, mentorName });
  return res.data;
};
