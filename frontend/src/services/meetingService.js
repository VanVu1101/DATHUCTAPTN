import apiClient from '../api/client';

export const getMeetings = async (periodId) => {
  const params = periodId ? { periodId } : undefined;
  const res = await apiClient.get('/meetings', { params });
  return res.data;
};

export const createMeeting = async (payload) => {
  const res = await apiClient.post('/meetings', payload);
  return res.data;
};

export const updateMeeting = async (id, payload) => {
  const res = await apiClient.put(`/meetings/${id}`, payload);
  return res.data;
};

export const deleteMeeting = async (id) => {
  const res = await apiClient.delete(`/meetings/${id}`);
  return res.data;
};
