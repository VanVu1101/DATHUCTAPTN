import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Attach Authorization header if token exists
apiClient.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {}
  return config;
});

// Global response handler: if unauthorized or forbidden, clear creds and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    try {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // navigate to login page for re-auth
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    } catch (e) {}
    return Promise.reject(error);
  }
);

export default apiClient;
