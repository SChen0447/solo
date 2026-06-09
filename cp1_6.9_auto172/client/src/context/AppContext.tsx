import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { UserData, RecipeElements, RecipeConditions } from '../types';
import { api } from '../utils/api';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'error';
}

interface AppState {
  user: UserData | null;
  elements: RecipeElements;
  conditions: RecipeConditions;
  toasts: Toast[];
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  addElement: (type: keyof RecipeElements, amount?: number) => void;
  resetElements: () => void;
  setCondition: (key: keyof RecipeConditions, value: number) => void;
  loadRecipeParams: (elements: RecipeElements, conditions: RecipeConditions) => void;
  showToast: (message: string, type?: Toast['type']) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(() => api.getStoredUser());
  const [elements, setElements] = useState<RecipeElements>({ stardust: 0, lightdust: 0, darkmatter: 0 });
  const [conditions, setConditions] = useState<RecipeConditions>({ temperature: 25, pressure: 1.0, stirRate: 0 });
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (user) api.storeUser(user);
    else api.storeUser(null);
  }, [user]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password);
    setUser(res.user);
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const res = await api.register(username, password);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  const addElement = useCallback((type: keyof RecipeElements, amount = 1) => {
    setElements(prev => ({ ...prev, [type]: Math.min(10, prev[type] + amount) }));
  }, []);

  const resetElements = useCallback(() => {
    setElements({ stardust: 0, lightdust: 0, darkmatter: 0 });
  }, []);

  const setCondition = useCallback((key: keyof RecipeConditions, value: number) => {
    setConditions(prev => ({ ...prev, [key]: value }));
  }, []);

  const loadRecipeParams = useCallback((e: RecipeElements, c: RecipeConditions) => {
    setElements(e);
    setConditions(c);
  }, []);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  return (
    <AppContext.Provider value={{
      user, elements, conditions, toasts,
      login, register, logout,
      addElement, resetElements, setCondition, loadRecipeParams, showToast
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
