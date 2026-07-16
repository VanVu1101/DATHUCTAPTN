import apiClient from '../api/client';

export const getMajors = async () => {
  const res = await apiClient.get('/students/majors');
  return res.data;
};

export const createMajor = async (payload) => {
  const res = await apiClient.post('/students/majors', payload);
  return res.data;
};

export const updateMajor = async (id, payload) => {
  const res = await apiClient.put(`/students/majors/${id}`, payload);
  return res.data;
};

export const deleteMajor = async (id) => {
  const res = await apiClient.delete(`/students/majors/${id}`);
  return res.data;
};
