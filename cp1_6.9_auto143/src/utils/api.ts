import type { Flower, Specimen, PaginatedFlowers, FlowerSpecies, CareAction } from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || '请求失败');
  }
  return res.json();
}

export const flowerAPI = {
  list: (page = 1, limit = 20) =>
    request<PaginatedFlowers>(`/flowers?page=${page}&limit=${limit}`),
  latest: () => request<Flower[]>(`/flowers/latest`),
  create: (species: FlowerSpecies, ownerName = '花语使者') =>
    request<Flower>('/flowers', {
      method: 'POST',
      body: JSON.stringify({ species, ownerName }),
    }),
  care: (id: string, action: CareAction) =>
    request<Flower>(`/flowers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    }),
};

export const specimenAPI = {
  list: () => request<Specimen[]>('/specimens'),
  create: (flowerId: string) =>
    request<Specimen>('/specimens', {
      method: 'POST',
      body: JSON.stringify({ flowerId }),
    }),
  updateFavorite: (id: string, favorite: boolean) =>
    request<Specimen>(`/specimens/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ favorite }),
    }),
  getShare: (id: string) =>
    request<{ shareUrl: string; shareToken: string }>(`/specimens/${id}/share`),
};
