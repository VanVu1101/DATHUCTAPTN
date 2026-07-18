import apiClient from '../api/client';

const CHECKINS_STORAGE_KEY = 'checkins-cache';

export const persistCheckIns = (checkIns) => {
  try {
    localStorage.setItem(CHECKINS_STORAGE_KEY, JSON.stringify(checkIns || []));
  } catch (error) {
    // ignore storage errors
  }
};

export const getCachedCheckIns = () => {
  try {
    const raw = localStorage.getItem(CHECKINS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
};

export const submitCheckIn = async (payload) => {
  console.log('[checkInService] submitCheckIn', payload);
  const res = await apiClient.post('/checkins', payload);
  console.log('[checkInService] submitCheckIn response', res?.data);
  return res.data;
};

export const submitCheckOut = async (payload) => {
  console.log('[checkInService] submitCheckOut', payload);
  const res = await apiClient.post('/checkins/checkout', payload);
  console.log('[checkInService] submitCheckOut response', res?.data);
  return res.data;
};

export const getMyCheckIns = async () => {
  const res = await apiClient.get('/checkins/me');
  if (res?.data?.success) {
    persistCheckIns(res.data.data || []);
  }
  return res.data;
};

export const getAdminCheckInSummary = async (periodId) => {
  const res = await apiClient.get('/checkins/admin/summary', {
    params: periodId ? { periodId } : undefined,
  });
  return res.data?.data || [];
};

export const getAdminCheckInDetail = async ({ studentId, status, periodId }) => {
  const res = await apiClient.get('/checkins/admin/detail', {
    params: { studentId, status, periodId: periodId || undefined },
  });
  return res.data?.data || { student: null, records: [] };
};
