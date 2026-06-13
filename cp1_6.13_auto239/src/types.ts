export interface ParticlePoint {
  x: number;
  y: number;
  color: string;
  size: number;
  opacity: number;
  timestamp: number;
}

export interface LetterSummary {
  id: string;
  title: string;
  remainingOpens: number;
  createdAt: number;
  isRead: boolean;
  hasPassword: boolean;
}

export interface LetterDetail extends LetterSummary {
  lightTrack: ParticlePoint[];
  audioData: string | null;
}

type View = 'list' | 'create' | 'view';

export default View;
