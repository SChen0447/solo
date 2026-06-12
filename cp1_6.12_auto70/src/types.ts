export type BookCategory = '科幻' | '文学' | '技术' | '艺术' | '历史' | '哲学' | '生活';

export type BookStatus = 'available' | 'exchanged' | 'pending';

export type ExchangeStatus = 'pending' | 'accepted' | 'rejected';

export interface Book {
  id: string;
  title: string;
  author: string;
  category: BookCategory;
  description: string;
  coverImage?: string;
  coverColor: string;
  ownerId: string;
  ownerName: string;
  status: BookStatus;
  rating: number;
  ratingCount: number;
  createdAt: string;
  exchangeHistory: ExchangeRecord[];
}

export interface ExchangeRecord {
  id: string;
  date: string;
  partnerName: string;
  partnerBookTitle: string;
}

export interface ExchangeRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromBookId: string;
  fromBookTitle: string;
  toUserId: string;
  toUserName: string;
  toBookId: string;
  toBookTitle: string;
  note: string;
  status: ExchangeStatus;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
