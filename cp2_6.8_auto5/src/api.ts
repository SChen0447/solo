import { Book, Bookmark, Stats } from './types';

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `请求失败: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API 请求错误:', error);
    throw error;
  }
}

export const api = {
  getBooks: (): Promise<Book[]> => 
    request<Book[]>('/books'),

  addBook: (title: string, author: string, totalChapters: number): Promise<Book> =>
    request<Book>('/books', {
      method: 'POST',
      body: JSON.stringify({ title, author, totalChapters })
    }),

  updateProgress: (bookId: string, currentChapter: number): Promise<Book> =>
    request<Book>(`/books/${bookId}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ currentChapter })
    }),

  addBookmark: (bookId: string, chapter: number, note: string, tags: string[]): Promise<Bookmark> =>
    request<Bookmark>(`/books/${bookId}/bookmarks`, {
      method: 'POST',
      body: JSON.stringify({ chapter, note, tags })
    }),

  deleteBookmark: (bookId: string, bookmarkId: string): Promise<void> =>
    request<void>(`/books/${bookId}/bookmarks/${bookmarkId}`, {
      method: 'DELETE'
    }),

  getStats: (): Promise<Stats> =>
    request<Stats>('/stats')
};
