import { Recipe, RecipeElements, RecipeConditions, SynthesisResult, UserData } from '../types';

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('stardust_token');
}

function setToken(token: string | null) {
  if (token) localStorage.setItem('stardust_token', token);
  else localStorage.removeItem('stardust_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data as T;
}

export const api = {
  async register(username: string, password: string) {
    const res = await request<{ token: string; user: UserData }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setToken(res.token);
    return res;
  },

  async login(username: string, password: string) {
    const res = await request<{ token: string; user: UserData }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    setToken(res.token);
    return res;
  },

  logout() {
    setToken(null);
  },

  isLoggedIn(): boolean {
    return !!getToken();
  },

  getStoredUser(): UserData | null {
    const raw = localStorage.getItem('stardust_user');
    return raw ? JSON.parse(raw) : null;
  },

  storeUser(user: UserData | null) {
    if (user) localStorage.setItem('stardust_user', JSON.stringify(user));
    else localStorage.removeItem('stardust_user');
  },

  async getPublicRecipes(): Promise<Recipe[]> {
    return request<Recipe[]>('/recipes');
  },

  async getMyRecipes(): Promise<Recipe[]> {
    return request<Recipe[]>('/recipes/mine');
  },

  async getRecipe(id: string): Promise<Recipe> {
    return request<Recipe>(`/recipes/${id}`);
  },

  async createRecipe(data: {
    name: string;
    isPublic?: boolean;
    elements: RecipeElements;
    conditions: RecipeConditions;
    color: string;
    particleDensity: number;
  }): Promise<Recipe> {
    return request<Recipe>('/recipes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async likeRecipe(id: string): Promise<{ likes: number; liked: boolean }> {
    return request<{ likes: number; liked: boolean }>(`/recipes/${id}/like`, {
      method: 'PATCH'
    });
  }
};
