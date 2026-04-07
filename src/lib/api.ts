import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/auth.store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// Request: inject access token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response: handle 401 → refresh token, handle errors
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status   = error.response?.status;

    // 401 → try refresh
    if (status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
          { refreshToken }
        );
        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
        refreshQueue.forEach((cb) => cb(data.accessToken));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // 423 → conta bloqueada
    if (status === 423) {
      toast.error(error.response?.data?.message || 'Conta bloqueada (PCI REQ-8)');
      return Promise.reject(error);
    }

    // 403
    if (status === 403) {
      toast.error('Acesso não autorizado para esta ação');
      return Promise.reject(error);
    }

    // 500
    if (status >= 500) {
      toast.error('Erro interno do servidor. Tente novamente.');
    }

    return Promise.reject(error);
  }
);

export default api;
