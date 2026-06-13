import axios from 'axios';
import type { Profile, Work, Event, DailyStats, StatsSummary } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export const profileApi = {
  getProfile: (): Promise<Profile> =>
    api.get('/profile').then(res => res.data),
  
  updateProfile: (data: Partial<Profile>): Promise<Profile> =>
    api.put('/profile', data).then(res => res.data),
  
  uploadCover: (file: File): Promise<Profile> => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/profile/cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
  
  deleteCover: (): Promise<Profile> =>
    api.delete('/profile/cover').then(res => res.data)
};

export const worksApi = {
  getWorks: (): Promise<Work[]> =>
    api.get('/works').then(res => res.data),
  
  getWork: (id: string): Promise<Work> =>
    api.get(`/works/${id}`).then(res => res.data),
  
  uploadWork: (data: {
    title: string;
    description: string;
    tags: string[];
    duration: number;
    audioFile?: File;
    coverFile?: File;
  }): Promise<Work> => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('tags', data.tags.join(','));
    formData.append('duration', String(data.duration));
    if (data.audioFile) formData.append('audio', data.audioFile);
    if (data.coverFile) formData.append('cover', data.coverFile);
    return api.post('/works', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
  
  deleteWork: (id: string): Promise<void> =>
    api.delete(`/works/${id}`).then(res => res.data),
  
  incrementPlay: (id: string): Promise<Work> =>
    api.post(`/works/${id}/play`).then(res => res.data)
};

export const eventsApi = {
  getEvents: (): Promise<Event[]> =>
    api.get('/events').then(res => res.data),
  
  getEvent: (id: string): Promise<Event> =>
    api.get(`/events/${id}`).then(res => res.data),
  
  createEvent: (data: Omit<Event, 'id'>): Promise<Event> =>
    api.post('/events', data).then(res => res.data),
  
  deleteEvent: (id: string): Promise<void> =>
    api.delete(`/events/${id}`).then(res => res.data)
};

export const statsApi = {
  getDailyStats: (): Promise<DailyStats[]> =>
    api.get('/stats/daily').then(res => res.data),
  
  getSummary: (): Promise<StatsSummary> =>
    api.get('/stats/summary').then(res => res.data)
};

export const authApi = {
  login: (password: string): Promise<{ success: boolean; token: string }> =>
    api.post('/auth/login', { password }).then(res => res.data),
  
  logout: (): Promise<{ success: boolean }> =>
    api.post('/auth/logout').then(res => res.data)
};
