import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string) => void;
  register: (username: string) => void;
  logout: () => void;
  toggleFavorite: (paintingId: string) => void;
  isFavorite: (paintingId: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      login: (username) => {
        const trimmedName = username.trim();
        if (!trimmedName) return;
        const existingFavorites = get().user?.favorites ?? [];
        set({
          user: { username: trimmedName, favorites: existingFavorites },
          isAuthenticated: true,
        });
      },
      register: (username) => {
        const trimmedName = username.trim();
        if (!trimmedName) return;
        set({
          user: { username: trimmedName, favorites: [] },
          isAuthenticated: true,
        });
      },
      logout: () => {
        set({ user: null, isAuthenticated: false });
      },
      toggleFavorite: (paintingId) => {
        const { user, isAuthenticated } = get();
        if (!isAuthenticated || !user) return;
        const favorites = user.favorites.includes(paintingId)
          ? user.favorites.filter((id) => id !== paintingId)
          : [...user.favorites, paintingId];
        set({ user: { ...user, favorites } });
      },
      isFavorite: (paintingId) => {
        const { user, isAuthenticated } = get();
        if (!isAuthenticated || !user) return false;
        return user.favorites.includes(paintingId);
      },
    }),
    {
      name: 'paper-light-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
