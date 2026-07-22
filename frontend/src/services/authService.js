import apiClient from '../api/client';

export const login = async (payload) => {
  const response = await apiClient.post('/auth/login', payload);
  return response.data;
};

export const register = async (payload) => {
  const response = await apiClient.post('/auth/register', payload);
  return response.data;
};

export const getUsers = async () => {
  const response = await apiClient.get('/users');
  return response.data;
};

export const updateUserRole = async (id, role) => {
  const response = await apiClient.patch(`/users/${id}/role`, { role });
  return response.data;
};

export const changePassword = async (payload) => {
  const response = await apiClient.post('/auth/change-password', payload);
  return response.data;
};

export const forgotPassword = async (payload) => {
  const response = await apiClient.post('/auth/forgot-password', payload);
  return response.data;
};

export const requestPasswordReset = async (email) => {
  const response = await apiClient.post('/auth/request-password-reset', { email });
  return response.data;
};

export const getLoginHistory = async () => {
  const res = await apiClient.get('/auth/history');
  return res.data;
};
