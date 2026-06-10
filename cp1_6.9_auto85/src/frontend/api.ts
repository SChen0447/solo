import { Capsule, CreateCapsuleDto, ApiResponse } from '../backend/types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    const data = (await response.json()) as ApiResponse<T>;
    return data;
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : '请求失败',
    };
  }
}

export async function getCapsules(): Promise<Capsule[]> {
  const response = await request<Capsule[]>('/capsules');
  if (response.success && response.data) {
    return response.data;
  }
  return [];
}

export async function getCapsule(id: string): Promise<Capsule | null> {
  const response = await request<Capsule>(`/capsules/${id}`);
  if (response.success && response.data) {
    return response.data;
  }
  return null;
}

export async function createCapsule(dto: CreateCapsuleDto): Promise<Capsule | null> {
  const response = await request<Capsule>('/capsules', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  if (response.success && response.data) {
    return response.data;
  }
  return null;
}

export async function deleteCapsule(id: string): Promise<boolean> {
  const response = await request<{ id: string }>(`/capsules/${id}`, {
    method: 'DELETE',
  });
  return response.success;
}
