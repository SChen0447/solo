export type SceneStatus = 'draft' | 'lineart' | 'coloring' | 'finished';
export type ChapterStatus = 'draft' | 'scheduled' | 'published';
export type EmotionType = 'excited' | 'touched' | 'suspense' | 'funny' | 'shocked' | 'depressed';
export type PlatformName = 'website' | 'weibo' | 'pixiv' | 'twitter';
export type ExportFormat = 'longimage' | 'zip' | 'standard';

export interface Character {
  id: string;
  name: string;
  avatar: string;
  traits: string[];
  dialogueTemplate: string;
}

export interface PlatformConfig {
  name: PlatformName;
  format: ExportFormat;
  resolution: string;
  enabled: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  scheduledDate: string;
  platforms: PlatformConfig[];
  status: ChapterStatus;
}

export interface Scene {
  id: string;
  projectId: string;
  order: number;
  thumbnail: string;
  script: string;
  dialogue: string;
  artistId: string;
  status: SceneStatus;
  chapterId: string;
}

export interface LogEntry {
  id: string;
  projectId: string;
  operator: string;
  action: string;
  summary: string;
  timestamp: string;
  snapshot: Project | null;
}

export interface Project {
  id: string;
  title: string;
  cover: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  order: number;
  characters: Character[];
  chapters: Chapter[];
  scenes: Scene[];
  logs: LogEntry[];
}

export interface ProjectSummary {
  id: string;
  title: string;
  cover: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  order: number;
}

export interface Feedback {
  id: string;
  chapterId: string;
  emotion: EmotionType;
  comment: string;
  createdAt: string;
}

export interface EmotionStats {
  excited: number;
  touched: number;
  suspense: number;
  funny: number;
  shocked: number;
  depressed: number;
  total: number;
}
