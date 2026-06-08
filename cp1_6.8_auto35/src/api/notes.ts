import axios from 'axios';
import type { Note, NoteFormData, NotesResponse, Stats } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const notesApi = {
  async getNotes(params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  }): Promise<NotesResponse> {
    const { data } = await api.get('/notes', { params });
    return data;
  },

  async getNote(id: string): Promise<Note> {
    const { data } = await api.get(`/notes/${id}`);
    return data;
  },

  async createNote(note: NoteFormData): Promise<Note> {
    const { data } = await api.post('/notes', note);
    return data;
  },

  async updateNote(id: string, note: Partial<NoteFormData>): Promise<Note> {
    const { data } = await api.put(`/notes/${id}`, note);
    return data;
  },

  async deleteNote(id: string): Promise<{ success: boolean }> {
    const { data } = await api.delete(`/notes/${id}`);
    return data;
  },

  async getStats(): Promise<Stats> {
    const { data } = await api.get('/stats');
    return data;
  },
};
