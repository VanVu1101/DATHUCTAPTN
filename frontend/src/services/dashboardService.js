import apiClient from '../api/client';

export const getStats = async () => {
  const res = await apiClient.get('/dashboard/stats');
  return res.data; // { success, data }
};
