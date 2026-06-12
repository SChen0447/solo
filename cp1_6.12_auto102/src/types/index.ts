export interface Position {
  page: 'left' | 'right';
  lineIndex: number;
}

export interface Comment {
  id: string;
  userId: number;
  userName: string;
  text: string;
  timestamp: number;
}

export interface Annotation {
  id: string;
  userId: number;
  bookId: string;
  segmentText: string;
  fullText: string;
  timestamp: number;
  likes: number;
  position: Position;
  comments: Comment[];
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverGradient: string;
  pages: string[][];
}

export type ViewMode = 'bookshelf' | 'reading';
