import type {
  Candle,
  Order,
  Customer,
  PaginatedResponse,
  CandleFormData,
  OrderFormData,
  FragranceType,
} from './types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`请求失败: ${res.status} ${res.statusText}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export async function getCandles(params?: {
  search?: string;
  fragrance?: FragranceType;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Candle>> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.fragrance) query.set('fragrance', params.fragrance);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  const queryStr = query.toString();
  return request<PaginatedResponse<Candle>>(`/candles${queryStr ? `?${queryStr}` : ''}`);
}

export async function getCandle(id: string): Promise<Candle> {
  return request<Candle>(`/candles/${id}`);
}

export async function createCandle(data: CandleFormData): Promise<Candle> {
  return request<Candle>('/candles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCandle(id: string, data: Partial<CandleFormData>): Promise<Candle> {
  return request<Candle>(`/candles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCandle(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/candles/${id}`, {
    method: 'DELETE',
  });
}

export async function getOrders(): Promise<Order[]> {
  return request<Order[]>('/orders');
}

export async function getOrder(id: string): Promise<Order> {
  return request<Order>(`/orders/${id}`);
}

export async function createOrder(data: OrderFormData): Promise<Order> {
  return request<Order>('/orders', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateOrder(
  id: string,
  data: Partial<OrderFormData>
): Promise<Order> {
  return request<Order>(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteOrder(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/orders/${id}`, {
    method: 'DELETE',
  });
}

export async function getCustomers(): Promise<Customer[]> {
  return request<Customer[]>('/customers');
}

export async function getCustomer(id: string): Promise<Customer> {
  return request<Customer>(`/customers/${id}`);
}

export async function getCustomerByPhone(phone: string): Promise<Customer | null> {
  return request<Customer | null>(`/customers/by-phone/${encodeURIComponent(phone)}`);
}

export async function updateCustomer(
  id: string,
  data: Partial<Customer>
): Promise<Customer> {
  return request<Customer>(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function generateNotifications(orderIds: string[]): Promise<{ text: string }> {
  return request<{ text: string }>('/notifications/generate', {
    method: 'POST',
    body: JSON.stringify({ orderIds }),
  });
}
