import axios from 'axios';
import type { Activity, Signup, Reader } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || '请求失败，请稍后重试';
    return Promise.reject(new Error(message));
  }
);

export const activityApi = {
  getList: (): Promise<Activity[]> =>
    api.get('/activities').then((r) => r.data),

  getById: (id: string): Promise<Activity> =>
    api.get(`/activities/${id}`).then((r) => r.data),

  create: (data: Partial<Activity>): Promise<Activity> =>
    api.post('/activities', data).then((r) => r.data),

  signup: (id: string, data: { name: string; readerId: string; phone: string }): Promise<Signup> =>
    api.post(`/activities/${id}/signup`, data).then((r) => r.data),

  checkin: (id: string, readerId: string): Promise<Signup> =>
    api.put(`/activities/${id}/checkin`, { readerId }).then((r) => r.data)
};

export const readerApi = {
  getBorrowedBooks: (readerId: string): Promise<Reader> =>
    api.get(`/readers/${readerId}/books`).then((r) => r.data)
};

export default api;
