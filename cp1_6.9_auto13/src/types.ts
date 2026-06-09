export type AnnotationColor = 'yellow' | 'blue' | 'green' | 'red';

export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: number;
  replies: Comment[];
  level: number;
}

export interface Annotation {
  id: string;
  x: number;
  y: number;
  color: AnnotationColor;
  author: string;
  content: string;
  timestamp: number;
  comments: Comment[];
}

export interface DesignFile {
  id: string;
  url: string;
  filename: string;
  mimetype: string;
  uploadedAt: number;
  annotations: Annotation[];
}

export interface VersionSnapshot {
  id: string;
  timestamp: number;
  annotations: Annotation[];
  designId: string;
  description?: string;
}

export interface Notification {
  id: string;
  type: 'new_annotation' | 'new_reply';
  author: string;
  summary: string;
  timestamp: number;
  read: boolean;
}

export interface ProjectData {
  designs: DesignFile[];
  versions: VersionSnapshot[];
  notifications: Notification[];
  currentUserName: string;
}

export const COLOR_MAP: Record<AnnotationColor, string> = {
  yellow: '#faad14',
  blue: '#4f7cff',
  green: '#52c41a',
  red: '#ff4d4f',
};

export const COLOR_BG_MAP: Record<AnnotationColor, string> = {
  yellow: 'rgba(250, 173, 20, 0.25)',
  blue: 'rgba(79, 124, 255, 0.25)',
  green: 'rgba(82, 196, 26, 0.25)',
  red: 'rgba(255, 77, 79, 0.25)',
};
