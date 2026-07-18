import apiClient from '../api/client';

export const getConversations = async () => {
  const response = await apiClient.get('/chat/conversations');
  return response.data?.data || [];
};

export const getMessages = async (conversationId, params = {}) => {
  const response = await apiClient.get(`/chat/conversations/${conversationId}/messages`, { params });
  return response.data?.data || [];
};

export const sendMessage = async (conversationId, payload) => {
  const response = await apiClient.post(`/chat/conversations/${conversationId}/messages`, payload);
  return response.data?.data;
};

export const markConversationRead = async (conversationId, lastMessageId = null) => {
  const response = await apiClient.post(`/chat/conversations/${conversationId}/read`, {
    lastMessageId,
  });
  return response.data?.data;
};

export const uploadChatAttachment = async (conversationId, file) => {
  const formData = new FormData();
  formData.append('conversationId', conversationId);
  formData.append('file', file);
  const response = await apiClient.post('/chat/attachments', formData);
  return response.data?.data;
};

export const getChatUnreadCount = async () => {
  const response = await apiClient.get('/chat/unread-count');
  return response.data?.data?.count || 0;
};

export default {
  getConversations,
  getMessages,
  sendMessage,
  markConversationRead,
  uploadChatAttachment,
  getChatUnreadCount,
};
