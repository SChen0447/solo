export interface Book {
  id: string;
  title: string;
  author: string;
  year: string;
  isbn: string;
  status: 'available' | 'borrowed' | 'exchanged';
  coverUrl: string;
  notes: string;
  createdAt: string;
}

export interface Reader {
  id: string;
  name: string;
  phone: string;
  registerDate: string;
  avatarUrl: string;
  points: number;
  credit: number;
  exchangeCredit: number;
}

export interface BorrowRecord {
  id: string;
  bookId: string;
  readerId: string;
  borrowDate: string;
  expectedReturnDate: string;
  returnDate: string | null;
  status: 'borrowed' | 'returned';
  bookTitle?: string;
  readerName?: string;
  overdueDays?: number;
}

export interface ExchangeRequest {
  id: string;
  readerId: string;
  bookTitle: string;
  author: string;
  bookCondition: string;
  requestDate: string;
  status: 'pending' | 'accepted' | 'rejected';
  readerName?: string;
  currentExchangeCredit?: number;
}

export type ActivityType = 'borrow' | 'return' | 'exchange';

export interface Activity {
  id: string;
  type: ActivityType;
  bookTitle: string;
  readerName?: string;
  timestamp: string;
}
