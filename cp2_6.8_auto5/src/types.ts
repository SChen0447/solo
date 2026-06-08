export interface Bookmark {
  id: string;
  chapter: number;
  note: string;
  tags: string[];
  createdAt: string;
}

export interface ProgressHistory {
  date: string;
  chaptersRead: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  totalChapters: number;
  currentChapter: number;
  coverColor: string;
  bookmarks: Bookmark[];
  progressHistory: ProgressHistory[];
  createdAt: string;
}

export interface BookCompletion {
  name: string;
  progress: number;
  current: number;
  total: number;
}

export interface WeeklyData {
  day: string;
  chapters: number;
}

export interface MonthlyData {
  date: string;
  chapters: number;
}

export interface StatsSummary {
  totalBooks: number;
  completedBooks: number;
  totalBookmarks: number;
  weeklyChapters: number;
  monthlyChapters: number;
}

export interface Stats {
  weeklyData: WeeklyData[];
  monthlyData: MonthlyData[];
  bookCompletion: BookCompletion[];
  summary: StatsSummary;
}

export type ViewType = 'list' | 'detail' | 'stats';
