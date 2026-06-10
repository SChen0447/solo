export type ScheduleType = 'rehearsal' | 'gig';
export type MemberStatusType = 'idle' | 'rehearsing' | 'resting';

export interface Schedule {
  id: string;
  title: string;
  type: ScheduleType;
  date: string;
  location: string;
  notes: string;
  completed: boolean;
  cancelled: boolean;
}

export interface Song {
  id: string;
  title: string;
  key: string;
  bpm: number;
  content: string;
}

export interface Member {
  id: string;
  name: string;
  color: string;
  status: MemberStatusType;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}
