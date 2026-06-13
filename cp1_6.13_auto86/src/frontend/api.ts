import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

export const getUserId = (): string => {
  let id = localStorage.getItem('mf_user_id');
  if (!id) {
    id = 'user_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('mf_user_id', id);
  }
  return id;
};

export const userAPI = {
  get: (userId: string) => api.get(`/users/${userId}`),
  completeTask: (userId: string, taskType: string, detail?: string) =>
    api.post(`/users/${userId}/tasks/${taskType}/complete`, { detail }),
  getPetals: (userId: string) => api.get(`/users/${userId}/petals`),
  openBlindBox: (userId: string) => api.post(`/users/${userId}/blindbox/open`),
  getCards: (userId: string) => api.get(`/users/${userId}/cards`),
  synthesize: (userId: string, card1Id: string, card2Id: string) =>
    api.post(`/users/${userId}/cards/synthesize`, { card1Id, card2Id }),
  getPublic: (userId: string) => api.get(`/users/${userId}/public`),
  searchUsers: (excludeId: string) => api.get('/users/search', { params: { excludeId } })
};

export const exchangeAPI = {
  create: (data: { fromUserId: string; toUserId: string; offeredCardId: string; requestedCardId: string }) =>
    api.post('/exchanges', data),
  list: (userId: string) => api.get(`/exchanges/user/${userId}`),
  accept: (id: string) => api.post(`/exchanges/${id}/accept`),
  reject: (id: string) => api.post(`/exchanges/${id}/reject`)
};
