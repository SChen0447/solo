import type { Recipe, BakeLog, UploadResponse } from './types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || '请求失败');
  }
  return res.json();
}

export const api = {
  getRecipes: () => request<Recipe[]>('/recipes'),
  getRecipe: (id: string) => request<Recipe>(`/recipes/${id}`),
  createRecipe: (data: Partial<Recipe>) =>
    request<Recipe>('/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  updateRecipe: (id: string, data: Partial<Recipe>) =>
    request<Recipe>(`/recipes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  deleteRecipe: (id: string) =>
    request<{ success: boolean }>(`/recipes/${id}`, { method: 'DELETE' }),

  getLogs: (recipeId: string) => request<BakeLog[]>(`/recipes/${recipeId}/logs`),
  createLog: (recipeId: string, data: Partial<BakeLog>) =>
    request<BakeLog>(`/recipes/${recipeId}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return request<UploadResponse>('/upload', {
      method: 'POST',
      body: formData,
    });
  },
};
