export interface Note {
  id: string;
  pitch: string;
  startTime: number;
  duration: number;
  trackId: number;
}

export interface Track {
  id: number;
  color: string;
  notes: Note[];
  userId: string | null;
  volume: number;
  muted: boolean;
}

export interface User {
  id: string;
  name: string;
  trackIndex: number;
  color: string;
  cursorX?: number;
  cursorY?: number;
  currentNote?: { pitch: string; startTime: number } | null;
}

export interface HistoryAction {
  type: 'add' | 'update' | 'delete';
  noteId: string;
  previousState?: Note;
  newState?: Note;
}

export type AppView = 'lobby' | 'sequencer';
