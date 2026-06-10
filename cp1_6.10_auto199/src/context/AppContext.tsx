import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, Exhibit, ArtworkData } from '../types';
import { storage } from '../utils/storage';
import { generateId } from '../utils/helpers';

interface AppContextType {
  currentUser: User | null;
  exhibits: Record<string, Exhibit>;
  login: (username: string, password: string) => boolean;
  register: (username: string, password: string) => boolean;
  logout: () => void;
  saveExhibit: (artworks: ArtworkData[], wallCount: number) => string;
  getExhibitById: (id: string) => Exhibit | null;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [exhibits, setExhibits] = useState<Record<string, Exhibit>>({});

  useEffect(() => {
    const savedUsername = storage.getCurrentUser();
    if (savedUsername) {
      const users = storage.getUsers();
      const user = users.find(u => u.username === savedUsername);
      if (user) setCurrentUser(user);
    }
    setExhibits(storage.getExhibits());
  }, []);

  const login = (username: string, password: string): boolean => {
    const users = storage.getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      storage.setCurrentUser(username);
      return true;
    }
    return false;
  };

  const register = (username: string, password: string): boolean => {
    const users = storage.getUsers();
    if (users.some(u => u.username === username)) return false;
    const newUser: User = { username, password };
    users.push(newUser);
    storage.saveUsers(users);
    setCurrentUser(newUser);
    storage.setCurrentUser(username);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    storage.setCurrentUser(null);
  };

  const saveExhibit = (artworks: ArtworkData[], wallCount: number): string => {
    const id = generateId(8);
    const exhibit: Exhibit = {
      id,
      owner: currentUser?.username || 'anonymous',
      createdAt: Date.now(),
      wallCount,
      artworks
    };
    storage.saveExhibit(exhibit);
    setExhibits(prev => ({ ...prev, [id]: exhibit }));
    return id;
  };

  const getExhibitById = (id: string): Exhibit | null => {
    return storage.getExhibit(id);
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      exhibits,
      login,
      register,
      logout,
      saveExhibit,
      getExhibitById
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
