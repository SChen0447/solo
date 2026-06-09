export interface User {
  id: number;
  nickname: string;
  passwordHash: string;
  avatarColor: string;
  createdAt: string;
}

export type BookStatus = 'available' | 'borrowed';

export interface Book {
  id: number;
  ownerId: number;
  title: string;
  author: string;
  coverUrl: string;
  status: BookStatus;
  borrowerId: number | null;
  sortOrder: number;
  createdAt: string;
}

export interface BorrowHistory {
  id: number;
  bookId: number;
  borrowerId: number;
  ownerId: number;
  action: 'borrowed' | 'returned' | 'note_added';
  note?: string;
  createdAt: string;
}

export interface BorrowRequest {
  id: number;
  bookId: number;
  requesterId: number;
  ownerId: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Activity {
  id: number;
  userId: number;
  userNickname: string;
  avatarColor: string;
  bookTitle: string;
  actionType: 'borrowed' | 'returned' | 'note_added' | 'book_added';
  note?: string;
  createdAt: string;
}

export interface JWTPayload {
  userId: number;
  nickname: string;
}
