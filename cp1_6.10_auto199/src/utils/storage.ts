import type { User, Exhibit } from '../types';

const USERS_KEY = 'vg_users';
const CURRENT_USER_KEY = 'vg_currentUser';
const EXHIBITS_KEY = 'vg_exhibits';

export const storage = {
  getUsers(): User[] {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveUsers(users: User[]): void {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  getCurrentUser(): string | null {
    return localStorage.getItem(CURRENT_USER_KEY);
  },

  setCurrentUser(username: string | null): void {
    if (username) {
      localStorage.setItem(CURRENT_USER_KEY, username);
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  },

  getExhibits(): Record<string, Exhibit> {
    const data = localStorage.getItem(EXHIBITS_KEY);
    return data ? JSON.parse(data) : {};
  },

  saveExhibit(exhibit: Exhibit): void {
    const exhibits = this.getExhibits();
    exhibits[exhibit.id] = exhibit;
    localStorage.setItem(EXHIBITS_KEY, JSON.stringify(exhibits));
  },

  getExhibit(id: string): Exhibit | null {
    const exhibits = this.getExhibits();
    return exhibits[id] || null;
  }
};
