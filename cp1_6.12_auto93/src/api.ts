import axios from 'axios';
import type { Book, BorrowRecord, WeeklyReport, User, BorrowRequest, ReviewRequest, LoginRequest } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export const bookApi = {
  getAll: () => api.get<Book[]>('/books'),
  getById: (id: string) => api.get<Book>(`/books/${id}`),
  getByOwner: (ownerId: string) => api.get<Book[]>(`/books/owner/${ownerId}`),
  updateStatus: (id: string, isAvailable: boolean) =>
    api.patch<Book>(`/books/${id}/status`, { isAvailable }),
  addToWaitQueue: (bookId: string, userId: string) =>
    api.post<Book>(`/books/${bookId}/queue`, { userId }),
  toggleFavorite: (bookId: string, userId: string) =>
    api.post(`/books/${bookId}/favorite`, { userId }),
};

export const borrowApi = {
  getAll: () => api.get<BorrowRecord[]>('/borrows'),
  getByUser: (userId: string) => api.get<BorrowRecord[]>(`/borrows/user/${userId}`),
  create: (data: BorrowRequest) => api.post<BorrowRecord>('/borrows', data),
  returnBook: (id: string) => api.patch<BorrowRecord>(`/borrows/${id}/return`),
  review: (id: string, data: ReviewRequest) =>
    api.patch<BorrowRecord>(`/borrows/${id}/review`, data),
};

export const reportApi = {
  getWeekly: () => api.get<WeeklyReport>('/report/weekly'),
};

export const authApi = {
  login: (data: LoginRequest) => api.post<User>('/auth/login', data),
  getCurrent: () => api.get<User>('/auth/me'),
};
