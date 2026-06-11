export type NoteType = 'top' | 'middle' | 'base';

export interface AromaBase {
  id: string;
  name: string;
  nameEn: string;
  note: NoteType;
  color: string;
  description: string;
  iconSvg: string;
  tags: string[];
}

export interface BlendItem {
  baseId: string;
  ratio: number;
}

export interface NoteInfo {
  id: string;
  name: string;
  ratio: number;
  color: string;
}

export interface MoodTag {
  label: string;
  description: string;
}

export interface BlendResult {
  id: string;
  topNotes: NoteInfo[];
  middleNotes: NoteInfo[];
  baseNotes: NoteInfo[];
  totalScore: number;
  longevity: number;
  projection: number;
  moodTags: MoodTag[];
  dominantColor: string;
  createdAt: string;
}

export interface AromaHistoryItem {
  id: string;
  bases: BlendItem[];
  result: BlendResult;
  createdAt: string;
}

export type BlendProgress = 'idle' | 'mixing' | 'done';
