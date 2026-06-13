import type { User, Star, AuthResponse, ShareResponse, ShareData } from './types';

const API_BASE = '/api';

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const getToken = (): string | null => {
  return localStorage.getItem('token');
};

const setToken = (token: string) => {
  localStorage.setItem('token', token);
};

const clearToken = () => {
  localStorage.removeItem('token');
};

const request = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: '请求失败' }));
    throw new ApiError(data.error || '请求失败', response.status);
  }

  return response.json();
};

export const authApi = {
  register: (username: string, password: string): Promise<AuthResponse> => {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  login: (username: string, password: string): Promise<AuthResponse> => {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  logout: (): Promise<{ success: boolean }> => {
    return request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    });
  },
};

export const starsApi = {
  getStars: (): Promise<Star[]> => {
    return request<Star[]>('/stars');
  },

  createStar: (data: {
    x: number;
    y: number;
    color: string;
    size: number;
    content?: string;
  }): Promise<Star> => {
    return request<Star>('/stars', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateStar: (
    id: string,
    data: Partial<Pick<Star, 'x' | 'y' | 'content' | 'color' | 'size'>>
  ): Promise<Star> => {
    return request<Star>(`/stars/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteStar: (id: string): Promise<{ success: boolean }> => {
    return request<{ success: boolean }>(`/stars/${id}`, {
      method: 'DELETE',
    });
  },
};

export const shareApi = {
  createShare: (starId: string): Promise<ShareResponse> => {
    return request<ShareResponse>(`/share/${starId}`, {
      method: 'POST',
    });
  },

  getShare: (shortId: string): Promise<ShareData> => {
    return request<ShareData>(`/share/${shortId}`);
  },
};

export { getToken, setToken, clearToken, ApiError };
