import apiClient from '../api/client';

export const getSchedules = async (periodId) => {
  const params = periodId ? { periodId } : undefined;
  const res = await apiClient.get('/schedules', { params });
  return res.data;
};

export const createSchedule = async (payload) => {
  const res = await apiClient.post('/schedules', payload);
  return res.data;
};

export const updateSchedule = async (id, payload) => {
  const res = await apiClient.put(`/schedules/${id}`, payload);
  return res.data;
};

export const deleteSchedule = async (id) => {
  const res = await apiClient.delete(`/schedules/${id}`);
  return res.data;
};
