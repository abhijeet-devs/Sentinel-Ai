import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Auto-attach JWT token from store or localStorage
api.interceptors.request.use((config) => {
  const storeToken = useAuthStore.getState().token;
  const token = storeToken || localStorage.getItem('sentinel_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-redirect on 401 without infinite loops
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isAuthUrl =
        err.config?.url?.includes('/api/auth/login') ||
        err.config?.url?.includes('/api/auth/register');

      if (!isAuthUrl) {
        useAuthStore.getState().logout();
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth ───────────────────────────────────────────────────────

export const authApi = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
  regenerateKey: () => api.post('/api/auth/regenerate-key'),
};

// ── Analysis ───────────────────────────────────────────────────

export const analyzeApi = {
  single: (prompt) => api.post('/api/analyze/', { prompt }),
  batch: (prompts) => api.post('/api/analyze/batch', { prompts }),
  uploadCsv: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/analyze/upload-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ── History ────────────────────────────────────────────────────

export const historyApi = {
  list: (params) => api.get('/api/history/', { params }),
  stats: () => api.get('/api/history/stats'),
  export: () => api.get('/api/history/export'),
  exportCsv: (params) => api.get('/api/history/export/csv', { params, responseType: 'blob' }),
  delete: (id) => api.delete(`/api/history/${id}`),
  clearAll: () => api.delete('/api/history/'),
};

// ── Dashboard ──────────────────────────────────────────────────

export const dashboardApi = {
  get: () => api.get('/api/dashboard/'),
};

// ── Rules ──────────────────────────────────────────────────────

export const rulesApi = {
  list: () => api.get('/api/rules/'),
  create: (data) => api.post('/api/rules/', data),
  delete: (id) => api.delete(`/api/rules/${id}`),
  toggle: (id) => api.patch(`/api/rules/${id}/toggle`),
};

// ── Gateway ────────────────────────────────────────────────────
export const gatewayApi = {
  analyze: (data) => api.post('/api/gateway/analyze', data),
  models: () => api.get('/api/gateway/models'),
};

// ── Red Team ───────────────────────────────────────────────────
export const redteamApi = {
  generate: (data) => api.post('/api/redteam/generate', data),
  seeds: () => api.get('/api/redteam/seeds'),
};

// ── Reports ────────────────────────────────────────────────────
export const reportsApi = {
  download: (maliciousOnly = false) => api.get('/api/reports/download', {
    params: { malicious_only: maliciousOnly },
    responseType: 'blob',
  }),
  downloadThreats: () => api.get('/api/reports/download/threats', { responseType: 'blob' }),
};

export default api;
