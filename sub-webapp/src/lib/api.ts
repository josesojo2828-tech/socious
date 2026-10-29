import axios from 'axios';

// Use relative /api — Next.js rewrites proxy to the backend service.
// In Docker the rewrite destination is http://backend:3001/api/:path*.
export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach auth token (stored with sub_ prefix to not
// collide with the main nutringest.com session)
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sub_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('sub_access_token');
      localStorage.removeItem('sub_refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
