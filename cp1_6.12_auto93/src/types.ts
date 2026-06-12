export interface User {
  id: string;
  username: string;
  nickname: string;
  avatar?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  ownerId: string;
  ownerNickname: string;
  coverColor: string;
  coverGradient?: string;
  isAvailable: boolean;
  borrowCount: number;
  rating: number;
  ratingCount: number;
  description?: string;
  waitQueue: string[];
  createdAt: string;
}

export interface BorrowRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  borrowerId: string;
  borrowerNickname: string;
  lenderId: string;
  lenderNickname: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: 'borrowing' | 'returned' | 'overdue';
  rating?: number;
  review?: string;
  overdueDays?: number;
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  topBooks: {
    bookId: string;
    title: string;
    borrowCount: number;
    ownerNickname: string;
  }[];
  borrowTrend: {
    date: string;
    count: number;
  }[];
  userRanking: {
    userId: string;
    nickname: string;
    readingMinutes: number;
  }[];
  totalBorrows: number;
  totalUsers: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface BorrowRequest {
  bookId: string;
  borrowerId: string;
}

export interface ReviewRequest {
  recordId: string;
  rating: number;
  review: string;
}
