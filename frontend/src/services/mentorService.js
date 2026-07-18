import apiClient from '../api/client';

export const getMentors = async () => {
  const response = await apiClient.get('/mentors');
  return response.data?.data || [];
};

export const createMentor = async (payload) => {
  const response = await apiClient.post('/mentors', payload);
  return response.data;
};

export const updateMentor = async (id, payload) => {
  const response = await apiClient.put(`/mentors/${id}`, payload);
  return response.data;
};

export const deleteMentor = async (id) => {
  const response = await apiClient.delete(`/mentors/${id}`);
  return response.data;
};

export const getAssignedStudents = async () => {
  const response = await apiClient.get('/mentors/assigned-students');
  return response.data?.data || [];
};

export const getCompanyStudents = async () => {
  const response = await apiClient.get('/mentors/company-students');
  return response.data?.data || [];
};
