export type StyleId = 'watercolor' | 'sketch' | 'pixel' | 'oil';

export interface StyleInfo {
  id: StyleId;
  name: string;
  color: string;
  gradient: string;
}

export interface ProcessResult {
  styleId: StyleId;
  imageUrl: string;
}

export interface LikeStats {
  style: StyleId;
  likes: number;
}

export interface FavoriteItem {
  id: string;
  styleId: StyleId;
  imageUrl: string;
  originalImageUrl: string;
  timestamp: number;
}

export interface ProgressEvent {
  type: 'progress' | 'complete';
  progress?: number;
  result?: ProcessResult;
}
