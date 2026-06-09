import { create } from 'zustand';
import { PublicUser, LoginResponse } from '../types';
import { api, setToken, removeToken } from '../utils/api';

interface AuthState {
  user: PublicUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, nickname: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const response = await api.auth.login(email, password);
    if (response.success && response.data) {
      const data = response.data as LoginResponse;
      setToken(data.token);
      set({ user: data.user, isAuthenticated: true });
      return { success: true };
    }
    return { success: false, error: response.error };
  },

  register: async (email, password, nickname) => {
    const response = await api.auth.register(email, password, nickname);
    if (response.success && response.data) {
      const data = response.data as LoginResponse;
      setToken(data.token);
      set({ user: data.user, isAuthenticated: true });
      return { success: true };
    }
    return { success: false, error: response.error };
  },

  logout: () => {
    removeToken();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    const response = await api.auth.me();
    if (response.success && response.data) {
      set({ user: response.data as PublicUser, isAuthenticated: true, isLoading: false });
    } else {
      removeToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  }
}));
