import apiClient from '../api/client';

export const submitCheckIn = async (payload) => {
  const res = await apiClient.post('/checkins', payload);
  return res.data;
};

export const submitCheckOut = async (payload) => {
  const res = await apiClient.post('/checkins/checkout', payload);
  return res.data;
};

export const getMyCheckIns = async () => {
  const res = await apiClient.get('/checkins/me');
  return res.data;
};
