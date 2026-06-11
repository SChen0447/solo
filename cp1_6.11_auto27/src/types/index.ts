export interface TeamMember {
  id: string;
  name: string;
  anonymousName: string;
}

export interface Evaluation {
  id: string;
  targetId: string;
  rating: number;
  comment: string;
  timestamp: number;
  round: number;
}

export interface MemberStats {
  memberId: string;
  averageRating: number;
  totalEvaluations: number;
  ratings: number[];
}

export interface DailyStats {
  day: number;
  participantCount: number;
  averageRating: number;
}

export type TabType = 'home' | 'evaluate' | 'dashboard';
