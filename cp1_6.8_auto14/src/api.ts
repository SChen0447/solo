import axios from 'axios';
import type { Application, ApplicationStatus, Stats } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export const applicationApi = {
  getAll: (status?: string) =>
    api.get<Application[]>('/applications', { params: { status } }).then(res => res.data),

  getById: (id: string) =>
    api.get<Application>(`/applications/${id}`).then(res => res.data),

  create: (data: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<Application>('/applications', data).then(res => res.data),

  update: (id: string, data: Partial<Omit<Application, 'id' | 'createdAt'>>) =>
    api.put<Application>(`/applications/${id}`, data).then(res => res.data),

  remove: (id: string) =>
    api.delete<Application>(`/applications/${id}`).then(res => res.data),

  getStats: () =>
    api.get<Stats>('/stats').then(res => res.data),

  exportCSV: () =>
    api.get('/export', { responseType: 'blob' }).then(res => res.data),
};
