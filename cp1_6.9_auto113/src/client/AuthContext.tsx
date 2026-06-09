import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api, AuthResult } from './api';

export interface AuthUser {
  id: number;
  nickname: string;
  avatarColor: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (nickname: string, password: string) => Promise<void>;
  register: (nickname: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  const handleAuth = useCallback((result: AuthResult) => {
    setUser(result.user);
    setToken(result.token);
    localStorage.setItem('user', JSON.stringify(result.user));
    localStorage.setItem('token', result.token);
  }, []);

  const login = useCallback(async (nickname: string, password: string) => {
    const result = await api.login(nickname, password);
    handleAuth(result);
  }, [handleAuth]);

  const register = useCallback(async (nickname: string, password: string) => {
    const result = await api.register(nickname, password);
    handleAuth(result);
  }, [handleAuth]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    const t = localStorage.getItem('token');
    if (raw && !user) setUser(JSON.parse(raw));
    if (t && !token) setToken(t);
  }, [user, token]);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
