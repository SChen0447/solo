import { CapsuleData, User } from '../types';

const API_BASE = '/api';

const getToken = (): string | null => {
  return localStorage.getItem('token');
};

const getAuthHeaders = (): HeadersInit => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  token?: string;
  user?: User;
  capsule?: CapsuleData;
  capsules?: CapsuleData[];
  error?: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }

  return data;
}

export const authApi = {
  register: (username: string, email: string, password: string) =>
    request('/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    }),

  login: (username: string, password: string) =>
    request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })
};

export const capsuleApi = {
  getByUserId: (userId: string) =>
    request(`/capsules/${userId}`),

  create: (data: {
    title: string;
    content: string;
    imageUrl?: string;
    musicUrl?: string;
    unlockDate: string;
    themeColor: string;
  }) =>
    request('/capsules', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  getById: (id: string) =>
    request(`/capsule/${id}`)
};

export const saveAuth = (token: string, user: User) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getAuthUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};
