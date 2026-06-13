import axios from 'axios';
import type { Dish, GenerateRequest, FavoriteRequest, FavoriteItem } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const generateDish = async (emotion: GenerateRequest['emotion'], flavors: GenerateRequest['flavors']): Promise<Dish> => {
  const response = await api.post<Dish>('/generate', { emotion, flavors });
  return response.data;
};

export const toggleFavorite = async (dish: Dish): Promise<{ success: boolean; message: string; favorited: boolean }> => {
  const response = await api.post<{ success: boolean; message: string; favorited: boolean }>('/favorite', { dish });
  return response.data;
};

export const getFavorites = async (): Promise<FavoriteItem[]> => {
  const response = await api.get<FavoriteItem[]>('/favorites');
  return response.data;
};

export const deleteFavorite = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string }>(`/favorite/${id}`);
  return response.data;
};

export const getRecommendedDishes = async (): Promise<Dish[]> => {
  const response = await api.get<Dish[]>('/recommended');
  return response.data;
};

export const checkHealth = async (): Promise<{ status: string; timestamp: string }> => {
  const response = await api.get<{ status: string; timestamp: string }>('/health');
  return response.data;
};

export default api;
