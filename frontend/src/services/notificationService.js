import apiClient from '../api/client';

export const getNotifications = async () => {
  const res = await apiClient.get('/notifications');
  return res.data;
};

export const getUnreadCount = async () => {
  const res = await apiClient.get('/notifications/unreadCount');
  return res.data?.data?.count || 0;
};

export const markAsRead = async (id) => {
  const res = await apiClient.post(`/notifications/${id}/read`);
  return res.data;
};

export default { getNotifications, getUnreadCount, markAsRead };
