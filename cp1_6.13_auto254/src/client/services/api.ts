import type { DiaryEntry, DiaryCreateInput, DiaryUpdateInput, EmotionType } from '@/shared/types';

const API_BASE = '/api';

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });
    const json = await res.json();
    return json;
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export const diaryApi = {
  async getAll(): Promise<DiaryEntry[]> {
    const res = await request<DiaryEntry[]>('/diaries');
    return res.success && res.data ? res.data : [];
  },

  async getById(id: string): Promise<DiaryEntry | null> {
    const res = await request<DiaryEntry>(`/diaries/${id}`);
    return res.success && res.data ? res.data : null;
  },

  async create(input: DiaryCreateInput): Promise<DiaryEntry | null> {
    const res = await request<DiaryEntry>('/diaries', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.success && res.data ? res.data : null;
  },

  async update(id: string, input: DiaryUpdateInput): Promise<DiaryEntry | null> {
    const res = await request<DiaryEntry>(`/diaries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
    return res.success && res.data ? res.data : null;
  },

  async remove(id: string): Promise<boolean> {
    const res = await request(`/diaries/${id}`, { method: 'DELETE' });
    return res.success;
  },

  async getShare(id: string): Promise<DiaryEntry | null> {
    const res = await request<DiaryEntry>(`/share/${id}`);
    return res.success && res.data ? res.data : null;
  },
};
