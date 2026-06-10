import { User, Capsule } from './types';

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data;
}

export const authApi = {
  register: (username: string, password: string) =>
    request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  login: (username: string, password: string) =>
    request<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })
};

export const userApi = {
  search: (q: string) =>
    request<User[]>(`/users/search?q=${encodeURIComponent(q)}`),
  getById: (id: string) =>
    request<User>(`/users/${id}`)
};

export const capsuleApi = {
  list: (userId: string) =>
    request<Capsule[]>(`/capsules?userId=${userId}`),
  get: (id: string) =>
    request<Capsule>(`/capsules/${id}`),
  create: (data: Partial<Capsule> & { senderId: string; recipientName: string; mood: string; moodColor: string; content: string; openAt: string }) =>
    request<Capsule>('/capsules', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  open: (id: string) =>
    request<Capsule>(`/capsules/${id}/open`, { method: 'POST' }),
  reply: (id: string, content: string) =>
    request<Capsule>(`/capsules/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content })
    })
};

export const uploadApi = {
  photos: async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach(f => formData.append('photos', f));
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '上传失败');
    return data.urls;
  }
};
