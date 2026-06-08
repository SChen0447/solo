export type ApplicationStatus = 'applied' | 'interviewing' | 'rejected' | 'offer';

export interface Application {
  id: string;
  company: string;
  position: string;
  applyDate: string;
  status: ApplicationStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  total: number;
  applied: number;
  interviewing: number;
  rejected: number;
  offer: number;
}

export type FilterType = 'all' | ApplicationStatus;

export type ViewMode = 'board' | 'timeline';
