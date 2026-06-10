import type { Order } from './types';

const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `请求失败: ${response.status}`);
  }
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  return response as unknown as T;
}

export async function fetchOrders(): Promise<Order[]> {
  const response = await fetch(`${API_BASE}/orders`);
  return handleResponse<Order[]>(response);
}

export async function acceptOrder(orderId: string): Promise<{ success: boolean; order: Order }> {
  const response = await fetch(`${API_BASE}/orders/accept/${orderId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<{ success: boolean; order: Order }>(response);
}

export async function rejectOrder(
  orderId: string,
  reason: string
): Promise<{ success: boolean; order: Order }> {
  const response = await fetch(`${API_BASE}/orders/reject/${orderId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  return handleResponse<{ success: boolean; order: Order }>(response);
}

export async function markOrderComplete(orderId: string): Promise<{ success: boolean; order: Order }> {
  const response = await fetch(`${API_BASE}/orders/complete/${orderId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<{ success: boolean; order: Order }>(response);
}

export async function exportTemplates(orderIds: string[]): Promise<Blob> {
  const response = await fetch(`${API_BASE}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderIds }),
  });
  if (!response.ok) {
    throw new Error('导出失败');
  }
  return response.blob();
}
