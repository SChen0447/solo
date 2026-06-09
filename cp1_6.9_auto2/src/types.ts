export type MoodType = '😄' | '😊' | '😐' | '😞' | '😢' | null;

export const MOODS: MoodType[] = ['😄', '😊', '😐', '😞', '😢'];

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  date: string;
}

export type MoodStore = Record<string, MoodType>;
export type TodoStore = Record<string, TodoItem[]>;

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateCN(date: Date): string {
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
