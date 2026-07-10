import apiClient from '../api/client';

export const submitReport = async (payload) => {
  const res = await apiClient.request({
    url: '/reports',
    method: 'post',
    data: payload,
    headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return res.data;
};

export const createWeeklyReport = async (payload) => {
  const res = await apiClient.post('/reports/weekly-reports', payload);
  return res.data;
};

export const createAdminReport = async (payload) => {
  const res = await apiClient.post('/reports/admin', payload);
  return res.data;
};

export const getWeeklyReports = async (periodId) => {
  const res = await apiClient.get('/reports/weekly-reports', {
    params: periodId ? { periodId } : {},
  });
  return res.data;
};

export const getMyWeeklyReports = async (periodId) => {
  const res = await apiClient.get('/reports/weekly-reports/me', {
    params: periodId ? { periodId } : undefined,
  });
  return res.data;
};

export const getMyReports = async () => {
  const res = await apiClient.get('/reports/me');
  return res.data;
};

export const getMySummary = async () => {
  const res = await apiClient.get('/reports/summary');
  return res.data;
};

export const getReportsByInternship = async (internshipId) => {
  const res = await apiClient.get(`/reports/internship/${internshipId}`);
  return res.data;
};

export const getAllReports = async (params = {}) => {
  const res = await apiClient.get('/reports/admin', { params });
  return res.data;
};

export const deleteReport = async (id) => {
  const res = await apiClient.delete(`/reports/admin/${id}`);
  return res.data;
};

export const updateReport = async (id, payload) => {
  const res = await apiClient.put(`/reports/admin/${id}`, payload);
  return res.data;
};

export const reviewReport = async (id, payload) => {
  const res = await apiClient.patch(`/reports/${id}/status`, payload);
  return res.data;
};
