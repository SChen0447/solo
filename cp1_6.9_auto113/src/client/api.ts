import { io, Socket } from 'socket.io-client';
import {
  User,
  Book,
  BorrowRequest,
  BorrowHistory,
  Activity,
} from '../shared/types.js';

const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '请求失败' }));
    throw new Error(err.error || '请求失败');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface AuthResult {
  user: Pick<User, 'id' | 'nickname' | 'avatarColor'>;
  token: string;
}

export const api = {
  register: (nickname: string, password: string) =>
    request<AuthResult>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ nickname, password }),
    }),
  login: (nickname: string, password: string) =>
    request<AuthResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ nickname, password }),
    }),
  getMyBooks: () =>
    request<{ owned: Book[]; borrowed: Book[] }>('/books/mine'),
  getPublicBooks: () => request<Book[]>('/books/public'),
  getBook: (id: number) =>
    request<{ book: Book; history: BorrowHistory[] }>(`/books/${id}`),
  addBook: (title: string, author: string, coverUrl?: string) =>
    request<Book>('/books', {
      method: 'POST',
      body: JSON.stringify({ title, author, coverUrl }),
    }),
  removeBook: (id: number) =>
    request<{ ok: boolean }>(`/books/${id}`, { method: 'DELETE' }),
  reorderBooks: (order: number[]) =>
    request<{ ok: boolean }>('/books/reorder', {
      method: 'POST',
      body: JSON.stringify({ order }),
    }),
  requestBorrow: (bookId: number) =>
    request<BorrowRequest>(`/borrow/request/${bookId}`, { method: 'POST' }),
  handleBorrow: (requestId: number, approved: boolean) =>
    request<{ request: BorrowRequest; book?: Book }>(`/borrow/handle/${requestId}`, {
      method: 'POST',
      body: JSON.stringify({ approved }),
    }),
  returnBook: (bookId: number) =>
    request<Book>(`/borrow/return/${bookId}`, { method: 'POST' }),
  addNote: (bookId: number, note: string) =>
    request<BorrowHistory>(`/books/${bookId}/note`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),
  getPendingRequests: () =>
    request<Array<BorrowRequest & { requesterNickname: string; requesterAvatarColor: string; bookTitle: string }>>(
      '/requests/pending'
    ),
  getActivities: () => request<Activity[]>('/activities'),
  getUsers: () =>
    request<Array<Pick<User, 'id' | 'nickname' | 'avatarColor'>>>('/users'),
};

export function createSocket(token: string): Socket {
  return io({
    auth: { token },
    transports: ['websocket', 'polling'],
  });
}

export interface BorrowRequestEvent extends BorrowRequest {
  requesterNickname: string;
  requesterAvatarColor: string;
  bookTitle: string;
}

export interface BorrowResponseEvent {
  request: BorrowRequest;
  book?: Book;
  ownerNickname: string;
}

export interface BorrowReturnedEvent {
  book: Book;
  borrowerNickname: string;
}

export interface NoteEvent {
  history: BorrowHistory;
  bookTitle: string;
  borrowerNickname: string;
}

export interface ShelfUpdateEvent {
  userId: number;
  book: Book;
  asBorrower?: boolean;
}

export interface ShelfRemoveEvent {
  userId: number;
  bookId: number;
}

export interface ShelfRemoveBorrowedEvent {
  userId: number;
  bookId: number;
}

export interface ShelfReorderEvent {
  userId: number;
  order: number[];
}
