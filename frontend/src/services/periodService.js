import apiClient from '../api/client';

export const getAllPeriods = async (params = {}) => {
  const res = await apiClient.get('/periods', { params });
  return res.data;
};

export const getPeriodById = async (id) => {
  const res = await apiClient.get(`/periods/${id}`);
  return res.data;
};

export const createPeriod = async (payload) => {
  const res = await apiClient.post('/periods', payload);
  return res.data;
};

export const updatePeriod = async (id, payload) => {
  const res = await apiClient.put(`/periods/${id}`, payload);
  return res.data;
};

export const deletePeriod = async (id) => {
  const res = await apiClient.delete(`/periods/${id}`);
  return res.data;
};

export const uploadPeriodDocument = async (periodId, payload) => {
  const res = await apiClient.request({
    url: `/periods/${periodId}/documents`,
    method: 'post',
    data: payload,
    headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return res.data;
};
