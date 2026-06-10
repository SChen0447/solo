export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  remindAt: number;
  createdAt: number;
  expired: boolean;
}

const STORAGE_KEY = 'future-message-board-notes';

export const COLOR_PALETTE: string[] = [
  '#e74c3c',
  '#e67e22',
  '#f39c12',
  '#f1c40f',
  '#2ecc71',
  '#1abc9c',
  '#3498db',
  '#9b59b6',
  '#e91e63',
  '#34495e',
  '#7f8c8d',
  '#16a085'
];

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Note[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveNotes(notes: Note[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function addNote(note: Note): Note[] {
  const notes = loadNotes();
  notes.push(note);
  saveNotes(notes);
  return notes;
}

export function removeNote(id: string): Note[] {
  const notes = loadNotes().filter((n) => n.id !== id);
  saveNotes(notes);
  return notes;
}

export function updateNoteExpired(id: string, expired: boolean): Note[] {
  const notes = loadNotes();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx !== -1) {
    notes[idx].expired = expired;
    saveNotes(notes);
  }
  return notes;
}

export function sortNotes(notes: Note[]): Note[] {
  const now = Date.now();
  const active = notes.filter((n) => n.remindAt > now && !n.expired);
  const expired = notes.filter((n) => n.remindAt <= now || n.expired);

  active.sort((a, b) => a.remindAt - b.remindAt);
  expired.sort((a, b) => b.remindAt - a.remindAt);

  return [...active, ...expired];
}

export function formatCountdown(remindAt: number, expired: boolean): string {
  if (expired || remindAt <= Date.now()) {
    return '已过期';
  }
  const diff = remindAt - Date.now();
  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  if (totalHours < 1) {
    return '即将提醒';
  }
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) {
    return `还剩${days}天${hours}小时`;
  }
  return `还剩${hours}小时`;
}

export function isNoteExpired(note: Note): boolean {
  return note.expired || note.remindAt <= Date.now();
}
