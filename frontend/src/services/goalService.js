import apiClient from '../api/client';

export const getMyGoals = async () => {
  const res = await apiClient.get('/goals');
  return res.data;
};

export const uploadGoalAttachment = async (file) => {
  if (!file) return null;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'goals');

  const uploadRes = await apiClient.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  if (!uploadRes?.data?.success) {
    throw new Error(uploadRes?.data?.message || 'Không thể tải tệp đính kèm');
  }

  return {
    attachmentUrl: uploadRes.data.attachmentUrl || uploadRes.data.url || null,
    attachmentName: uploadRes.data.attachmentName || file.name || 'goal-attachment'
  };
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
  uploadGoalAttachment,
  createGoal,
  updateGoal,
  deleteGoal,
};
