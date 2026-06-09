import type { User, Exhibition, Exhibit, LightTrail, AuthResponse } from '../../shared/types';

const BASE = '/api';

const getToken = (): string | null => localStorage.getItem('token');

const headers = (json = true): Record<string, string> => {
  const h: Record<string, string> = {};
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  if (json) h['Content-Type'] = 'application/json';
  const visitorId = localStorage.getItem('visitorId');
  if (visitorId) h['X-Visitor-Id'] = visitorId;
  return h;
};

const handle = async (res: Response) => {
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
};

export const authApi = {
  register: (username: string, password: string): Promise<AuthResponse> =>
    fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ username, password })
    }).then(handle),

  login: (username: string, password: string): Promise<AuthResponse> =>
    fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ username, password })
    }).then(handle)
};

export const exhibitionApi = {
  list: (): Promise<Exhibition[]> =>
    fetch(`${BASE}/exhibitions`, { headers: headers() }).then(handle),

  get: (id: string): Promise<Exhibition> =>
    fetch(`${BASE}/exhibitions/${id}`, { headers: headers() }).then(handle),

  create: (name: string, themeColor: string): Promise<Exhibition> =>
    fetch(`${BASE}/exhibitions`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name, themeColor })
    }).then(handle),

  update: (id: string, data: Partial<Exhibition>): Promise<Exhibition> =>
    fetch(`${BASE}/exhibitions/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data)
    }).then(handle),

  like: (id: string): Promise<{ likes: number }> =>
    fetch(`${BASE}/exhibitions/${id}/like`, {
      method: 'POST',
      headers: headers()
    }).then(handle)
};

export const exhibitApi = {
  list: (exhibitionId: string): Promise<Exhibit[]> =>
    fetch(`${BASE}/exhibitions/${exhibitionId}/exhibits`, { headers: headers() }).then(handle),

  create: (data: Omit<Exhibit, 'id' | 'createdAt'>): Promise<Exhibit> =>
    fetch(`${BASE}/exhibits`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    }).then(handle),

  update: (id: string, data: Partial<Exhibit>): Promise<Exhibit> =>
    fetch(`${BASE}/exhibits/${id}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(data)
    }).then(handle),

  remove: (id: string): Promise<{ success: boolean }> =>
    fetch(`${BASE}/exhibits/${id}`, {
      method: 'DELETE',
      headers: headers()
    }).then(handle)
};

export const trailApi = {
  list: (exhibitId: string): Promise<LightTrail[]> =>
    fetch(`${BASE}/exhibits/${exhibitId}/trails`, { headers: headers() }).then(handle),

  create: (exhibitId: string, points: { x: number; y: number }[], color: string): Promise<LightTrail> =>
    fetch(`${BASE}/exhibits/${exhibitId}/trails`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ points, color })
    }).then(handle)
};

export const ensureVisitorId = (): string => {
  let id = localStorage.getItem('visitorId');
  if (!id) {
    id = 'v_' + Math.random().toString(36).slice(2, 12);
    localStorage.setItem('visitorId', id);
  }
  return id;
};
