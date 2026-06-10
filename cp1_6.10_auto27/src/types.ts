export type PageType = 'list' | 'checkin' | 'exchange';

export type Gender = 'male' | 'female';

export interface UserCard {
  id: string;
  name: string;
  position: string;
  company: string;
  email: string;
  phone: string;
  avatar: string;
  gender: Gender;
  contacts: string[];
}

export interface Activity {
  id: string;
  name: string;
  date: string;
  location: string;
  description: string;
  code: string;
  createdAt: number;
}

export interface CheckInRecord {
  id: string;
  activityId: string;
  userId: string;
  userCard: UserCard;
  checkedAt: number;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
