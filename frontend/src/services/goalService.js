import apiClient from '../api/client';

export const getMyGoals = async () => {
  const res = await apiClient.get('/goals');
  return res.data;
};

export const createGoal = async (payload) => {
  const res = await apiClient.post('/goals', payload);
  return res.data;
};

export const updateGoal = async (id, payload) => {
  const res = await apiClient.put(`/goals/${id}`, payload);
  return res.data;
};

export const deleteGoal = async (id) => {
  const res = await apiClient.delete(`/goals/${id}`);
  return res.data;
};

export default {
  getMyGoals,
  createGoal,
  updateGoal,
  deleteGoal,
};
