export type ChallengeStatus = 'in_progress' | 'completed' | 'expired';

export type TimePeriod = 'week' | 'month' | 'quarter';

export type DailyDuration = 15 | 30 | 60;

export interface Challenge {
  id: string;
  bookTitle: string;
  bookAuthor?: string;
  totalPages: number;
  currentPages: number;
  period: TimePeriod;
  dailyDuration: DailyDuration;
  dailyReminderTime: string;
  startDate: string;
  endDate: string;
  status: ChallengeStatus;
  createdAt: string;
}

export interface Note {
  id: string;
  challengeId: string;
  chapter: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
}

export interface ProgressLog {
  id: string;
  challengeId: string;
  date: string;
  pagesRead: number;
  totalPages: number;
  minutesRead: number;
}

export interface NotificationItem {
  id: string;
  challengeId: string;
  challengeTitle: string;
  message: string;
  scheduledTime: string;
  isRead: boolean;
  createdAt: string;
}

export interface Stats {
  totalChallenges: number;
  completedChallenges: number;
  completionRate: number;
  avgDailyMinutes: number;
  consecutiveDays: number;
}

export interface Book {
  title: string;
  author: string;
  totalPages: number;
}
