export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface ReadingPlan {
  id: string;
  bookTitle: string;
  bookAuthor: string;
  bookCover: string;
  bookPages: number;
  startDate: string;
  endDate: string;
  description: string;
  members: string[];
  progress: number;
}

export interface Annotation {
  id: string;
  readingId: string;
  userId: string;
  userName: string;
  pageNumber: number;
  content: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  readingId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
}

export interface UserProgress {
  readingId: string;
  userId: string;
  pagesRead: number;
  annotationsCount: number;
}

export interface AppState {
  currentUser: User;
  readingPlans: ReadingPlan[];
  annotations: Annotation[];
  chatMessages: ChatMessage[];
  userProgress: UserProgress[];
}

export type Action =
  | { type: 'ADD_ANNOTATION'; payload: Annotation }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_PROGRESS'; payload: UserProgress };
