export interface Signup {
  id: string;
  name: string;
  readerId: string;
  phone: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  signedUpAt: string;
}

export interface Activity {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  type: '文学' | '科学' | '艺术' | '生活';
  capacity: number;
  signups: Signup[];
  createdAt: string;
}

export interface BorrowedBook {
  id: string;
  title: string;
  author: string;
  coverColor: string;
}

export interface Reader {
  readerId: string;
  borrowedBooks: BorrowedBook[];
}

export type ActivityType = '文学' | '科学' | '艺术' | '生活';

export const TYPE_COLORS: Record<ActivityType, string> = {
  '文学': '#d4a373',
  '科学': '#a8d5ba',
  '艺术': '#b5838d',
  '生活': '#dda15e'
};
