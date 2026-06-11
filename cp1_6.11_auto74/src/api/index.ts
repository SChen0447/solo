import axios from 'axios';
import type { Card, Board, CardFormData } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export const boardApi = {
  async getAll(): Promise<Board[]> {
    const response = await api.get<Board[]>('/boards');
    return response.data;
  },

  async create(name: string): Promise<Board> {
    const response = await api.post<Board>('/boards', { name });
    return response.data;
  },

  async getCards(boardId: string): Promise<Card[]> {
    const response = await api.get<Card[]>(`/boards/${boardId}/cards`);
    return response.data;
  },
};

export const cardApi = {
  async create(data: CardFormData & { boardId: string }): Promise<Card> {
    const response = await api.post<Card>('/cards', data);
    return response.data;
  },

  async update(id: string, data: Partial<CardFormData>): Promise<Card> {
    const response = await api.put<Card>(`/cards/${id}`, data);
    return response.data;
  },

  async remove(id: string): Promise<{ success: boolean }> {
    const response = await api.delete<{ success: boolean }>(`/cards/${id}`);
    return response.data;
  },

  async reorder(id: string, newOrder: number): Promise<Card> {
    const response = await api.put<Card>(`/cards/${id}/reorder`, { newOrder });
    return response.data;
  },
};
