import type { Book, User, DriftRecord } from './types'

const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json() as Promise<T>
}

export const api = {
  getBooks: () => request<Book[]>('/books'),
  getBook: (id: string) => request<Book>(`/books/${id}`),
  createBook: (data: Partial<Book>) =>
    request<Book>('/books', { method: 'POST', body: JSON.stringify(data) }),
  updateBookStatus: (id: string, status: Book['status']) =>
    request<Book>(`/books/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  getUsers: () => request<User[]>('/users'),
  getUser: (id: string) => request<User>(`/users/${id}`),
  getUserBooks: (id: string) =>
    request<{ published: Book[]; exchanged: Book[] }>(`/users/${id}/books`),
  createExchange: (data: {
    bookId: string
    fromUserId: string
    toUserId: string
    message?: string
  }) =>
    request<DriftRecord>('/exchanges', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  confirmExchange: (id: string) =>
    request<DriftRecord>(`/exchanges/${id}/confirm`, { method: 'POST' }),
  completeExchange: (id: string) =>
    request<DriftRecord>(`/exchanges/${id}/complete`, { method: 'POST' }),
}
