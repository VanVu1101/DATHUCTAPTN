import apiClient from '../api/client';

export const getMyTasks = async (periodId, status) => {
  const params = {
    ...(periodId ? { periodId } : {}),
    ...(status ? { status } : {})
  };
  const res = await apiClient.get('/tasks/me', { params });
  return res.data;
};

export const getAllTasks = async (params = {}) => {
  const res = await apiClient.get('/tasks', { params });
  return res.data;
};

export const getTaskById = async (id) => {
  const res = await apiClient.get(`/tasks/${id}`);
  return res.data;
};

export const createTask = async (payload) => {
  const res = await apiClient.post('/tasks', payload);
  return res.data;
};

export const updateTask = async (id, payload) => {
  const res = await apiClient.put(`/tasks/${id}`, payload);
  return res.data;
};

export const deleteTask = async (id) => {
  const res = await apiClient.delete(`/tasks/${id}`);
  return res.data;
};

export const submitTask = async (id, payload) => {
  const formData = new FormData();
  if (payload.comment) formData.append('comment', payload.comment);
  if (payload.status) formData.append('status', payload.status);
  if (payload.file) formData.append('file', payload.file);
  const res = await apiClient.post(`/tasks/${id}/submit`, formData);
  return res.data;
};
