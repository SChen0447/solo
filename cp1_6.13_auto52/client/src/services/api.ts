import axios from 'axios';
import type { Book, Match, Message, User, CreateBookRequest, CreateMatchRequest, CreateMessageRequest } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const bookApi = {
  getBooks: (params?: { title?: string; author?: string; year?: number; ownerId?: string }) =>
    api.get<Book[]>('/books', { params }),
  
  getBook: (id: string) =>
    api.get<Book>(`/books/${id}`),
  
  createBook: (data: CreateBookRequest) =>
    api.post<Book>('/books', data),
};

export const matchApi = {
  getMatches: () =>
    api.get<Match[]>('/matches'),
  
  createMatch: (data: CreateMatchRequest) =>
    api.post<Match>('/matches', data),
  
  getMessages: (matchId: string) =>
    api.get<Message[]>(`/matches/${matchId}/messages`),
  
  sendMessage: (matchId: string, data: CreateMessageRequest) =>
    api.post<Message>(`/matches/${matchId}/messages`, data),
};

export const userApi = {
  getCurrentUser: () =>
    api.get<User>('/user'),
  
  getUnreadCount: () =>
    api.get<{ count: number }>('/messages/unread-count'),
};

export const compressImage = (file: File, maxSize: number = 300 * 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else {
            width = (width / height) * maxDim;
            height = maxDim;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建canvas上下文'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        let quality = 0.9;
        let result: string;
        
        do {
          result = canvas.toDataURL('image/jpeg', quality);
          quality -= 0.1;
        } while (result.length > maxSize && quality > 0.1);
        
        resolve(result);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
