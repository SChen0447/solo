import { ApiResponse } from '../types';

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function removeToken(): void {
  localStorage.removeItem('token');
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers
    });

    const data = await response.json();
    return data as ApiResponse<T>;
  } catch (error) {
    console.error('API request error:', error);
    return { success: false, error: '网络请求失败' };
  }
}

export const api = {
  auth: {
    register: (email: string, password: string, nickname: string) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, nickname })
      }),
    login: (email: string, password: string) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),
    me: () => request('/auth/me')
  },
  bookmarks: {
    list: (page: number = 1, search?: string, tag?: string) => {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.append('search', search);
      if (tag) params.append('tag', tag);
      return request(`/bookmarks?${params.toString()}`);
    },
    create: (data: { url: string; title: string; description?: string; tags?: string[] }) =>
      request('/bookmarks', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: { title?: string; description?: string; tags?: string[] }) =>
      request(`/bookmarks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    remove: (id: string) =>
      request(`/bookmarks/${id}`, { method: 'DELETE' }),
    favorite: (id: string) =>
      request(`/bookmarks/${id}/favorite`, { method: 'POST' }),
    favoriteStatus: (id: string) =>
      request(`/bookmarks/${id}/favorite/status`),
    share: (id: string) =>
      request(`/bookmarks/${id}/share`, { method: 'POST' })
  },
  users: {
    search: (query: string) =>
      request(`/users?q=${encodeURIComponent(query)}`),
    get: (id: string) => request(`/users/${id}`),
    getUserBookmarks: (id: string, page: number = 1, search?: string, tag?: string) => {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.append('search', search);
      if (tag) params.append('tag', tag);
      return request(`/users/${id}/bookmarks?${params.toString()}`);
    },
    follow: (id: string) =>
      request(`/users/${id}/follow`, { method: 'POST' }),
    unfollow: (id: string) =>
      request(`/users/${id}/follow`, { method: 'DELETE' }),
    followStatus: (id: string) =>
      request(`/users/${id}/follow-status`),
    followers: (id: string) => request(`/users/${id}/followers`),
    following: (id: string) => request(`/users/${id}/following`),
    timeline: (page: number = 1) =>
      request(`/timeline?page=${page}`),
    tags: () => request('/tags/list')
  },
  scrape: (url: string) =>
    request('/scrape', {
      method: 'POST',
      body: JSON.stringify({ url })
    })
};
