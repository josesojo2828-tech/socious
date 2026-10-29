import { create } from 'zustand';
import axios from 'axios';
import { apiClient } from '@/lib/api';
import type { User } from '@/types';

const ACCESS_KEY = 'sub_access_token';
const REFRESH_KEY = 'sub_refresh_token';

const getStored = (key: string) => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
};

const setStored = (key: string, value: string) => {
  if (typeof window !== 'undefined') localStorage.setItem(key, value);
};

const clearStored = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasChecked: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  hasChecked: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      setStored(ACCESS_KEY, data.tokens.access_token);
      setStored(REFRESH_KEY, data.tokens.refresh_token);
      set({ user: data.user, isAuthenticated: true, isLoading: false, error: null });
      return true;
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al iniciar sesión';
      set({ error: Array.isArray(msg) ? msg[0] : msg, isLoading: false, isAuthenticated: false });
      return false;
    }
  },

  logout: () => {
    clearStored();
    apiClient.post('/auth/logout').catch(() => {});
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    if (typeof window !== 'undefined') window.location.href = '/login';
  },

  init: async () => {
    const token = getStored(ACCESS_KEY);
    const refreshToken = getStored(REFRESH_KEY);

    if (!token && !refreshToken) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    set({ isLoading: true });
    try {
      // Refresh if expired
      if (token && isTokenExpired(token)) {
        if (!refreshToken) {
          clearStored();
          set({ isLoading: false, isAuthenticated: false });
          return;
        }
        const { data } = await axios.post(
          '/api/auth/refresh',
          {},
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        );
        setStored(ACCESS_KEY, data.access_token);
        setStored(REFRESH_KEY, data.refresh_token);
      }

      // Fetch user
      const { data } = await apiClient.get('/user/me');
      set({ user: data.data, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: any) {
      if (err?.response?.status === 401) {
        clearStored();
        set({ user: null, isAuthenticated: false, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    }
  },
}));
