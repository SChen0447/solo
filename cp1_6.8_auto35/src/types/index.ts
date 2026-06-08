export type Category = 'science' | 'history' | 'literature' | 'philosophy' | 'art';

export interface Note {
  id: string;
  title: string;
  author: string;
  category: Category;
  rating: number;
  content: string;
  excerpt: string;
  createdAt: number;
  updatedAt: number;
}

export interface NoteFormData {
  title: string;
  author: string;
  category: Category;
  rating: number;
  content: string;
}

export interface NotesResponse {
  notes: Note[];
  total: number;
  page: number;
  limit: number;
}

export interface Stats {
  total: number;
  avgRating: number;
  categoryCounts: Record<Category, number>;
}

export const CATEGORIES: { key: Category; label: string; color: string; gradient: string }[] = [
  { key: 'science', label: '科幻', color: '#4a90d9', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { key: 'history', label: '历史', color: '#d4a574', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { key: 'literature', label: '文学', color: '#5cb85c', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { key: 'philosophy', label: '哲学', color: '#f0ad4e', gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { key: 'art', label: '艺术', color: '#9b59b6', gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
];

export function getCategoryInfo(category: Category) {
  return CATEGORIES.find(c => c.key === category) || CATEGORIES[0];
}
