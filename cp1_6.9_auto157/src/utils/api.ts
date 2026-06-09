import type { Ink } from '../types';

const API_BASE = '/api';

export async function fetchInks(): Promise<Ink[]> {
  const res = await fetch(`${API_BASE}/inks`);
  if (!res.ok) throw new Error('Failed to fetch inks');
  return res.json();
}

export async function fetchInkById(id: string): Promise<Ink> {
  const res = await fetch(`${API_BASE}/inks/${id}`);
  if (!res.ok) throw new Error('Failed to fetch ink');
  return res.json();
}

export async function createInk(data: Omit<Ink, 'id' | 'createdAt'>): Promise<Ink> {
  const res = await fetch(`${API_BASE}/inks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create ink');
  return res.json();
}

export async function updateInk(id: string, data: Partial<Ink>): Promise<Ink> {
  const res = await fetch(`${API_BASE}/inks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update ink');
  return res.json();
}

export async function deleteInk(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/inks/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete ink');
  return true;
}
