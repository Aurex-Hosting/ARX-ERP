import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Accept': 'application/json',
  },
});

// Request interceptor: attach token & manage FormData headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('arx_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type');
      config.headers.delete('content-type');
    }
  }
  return config;
});

// Response interceptor: handle 401 unauthenticated
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('arx_token');
      localStorage.removeItem('arx_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
