import type { Painting } from '@/types';

const API_BASE = '/api';

export async function fetchPaintings(): Promise<Painting[]> {
  const response = await fetch(`${API_BASE}/paintings`);
  if (!response.ok) {
    throw new Error('获取画作列表失败');
  }
  return response.json();
}

export async function fetchPaintingById(id: string): Promise<Painting> {
  const response = await fetch(`${API_BASE}/paintings/${id}`);
  if (!response.ok) {
    throw new Error('画作不存在');
  }
  return response.json();
}
