import apiClient from '../api/client';

export const getMyEvaluation = async () => {
  const res = await apiClient.get('/evaluations/me');
  return res.data;
};

export const getEvaluationByInternship = async (internshipId) => {
  const res = await apiClient.get(`/evaluations/${internshipId}`);
  return res.data;
};

export const submitEvaluation = async (internshipId, payload) => {
  const res = await apiClient.post(`/evaluations/${internshipId}`, payload);
  return res.data;
};

export default { getMyEvaluation, getEvaluationByInternship, submitEvaluation };
