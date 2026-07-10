import apiClient from '../api/client';

export const login = async (payload) => {
  const response = await apiClient.post('/auth/login', payload);
  return response.data;
};

export const register = async (payload) => {
  const response = await apiClient.post('/auth/register', payload);
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
