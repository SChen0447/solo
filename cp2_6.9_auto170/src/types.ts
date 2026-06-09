export interface Book {
  id: string;
  name: string;
  author: string;
  color: string;
  totalPages: number;
  currentPage: number;
  createdAt: number;
}

export interface Card {
  id: string;
  bookId: string;
  bookName: string;
  excerpt: string;
  note: string;
  createdAt: number;
}
