export type MoodType = 'happy' | 'sad' | 'angry' | 'calm';

export interface Diary {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: MoodType;
  weather: string;
  stars: 1 | 2 | 3 | 4 | 5;
  shareHash?: string;
}

export interface MoodTrendPoint {
  date: string;
  stars: number;
  mood: MoodType;
}

export interface DiaryFormData {
  date: string;
  title: string;
  content: string;
  mood: MoodType;
  weather: string;
  stars: 1 | 2 | 3 | 4 | 5;
}

export const MOOD_CONFIG: Record<MoodType, { color: string; emoji: string; label: string }> = {
  happy: { color: '#FFD93D', emoji: '😊', label: '快乐' },
  sad: { color: '#4A6FA5', emoji: '😢', label: '悲伤' },
  angry: { color: '#E74C3C', emoji: '😠', label: '愤怒' },
  calm: { color: '#6BCB77', emoji: '😌', label: '平静' }
};

export const WEATHER_OPTIONS = ['☀️', '⛅', '☁️', '🌧️', '⛈️', '❄️', '🌫️'];

const STORAGE_KEY = 'mood_timeline_diaries';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generateHash(): string {
  return Math.random().toString(36).slice(2, 10);
}

function readStorage(): Diary[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Diary[];
    return [];
  } catch {
    return [];
  }
}

function writeStorage(diaries: Diary[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(diaries));
}

export function addDiary(data: DiaryFormData): Diary {
  const diaries = readStorage();
  const newDiary: Diary = {
    ...data,
    id: generateId()
  };
  diaries.push(newDiary);
  writeStorage(diaries);
  return newDiary;
}

export function updateDiary(id: string, patch: Partial<DiaryFormData>): Diary | null {
  const diaries = readStorage();
  const index = diaries.findIndex(d => d.id === id);
  if (index === -1) return null;
  diaries[index] = { ...diaries[index], ...patch };
  writeStorage(diaries);
  return diaries[index];
}

export function deleteDiary(id: string): boolean {
  const diaries = readStorage();
  const filtered = diaries.filter(d => d.id !== id);
  if (filtered.length === diaries.length) return false;
  writeStorage(filtered);
  return true;
}

export function getDiaries(year?: number, month?: number): Diary[] {
  const diaries = readStorage();
  let result = diaries;
  if (year !== undefined) {
    result = result.filter(d => {
      const dYear = parseInt(d.date.slice(0, 4), 10);
      return dYear === year;
    });
  }
  if (month !== undefined) {
    result = result.filter(d => {
      const dMonth = parseInt(d.date.slice(5, 7), 10);
      return dMonth === month;
    });
  }
  return result.sort((a, b) => b.date.localeCompare(a.date));
}

export function getDiaryById(id: string): Diary | undefined {
  const diaries = readStorage();
  return diaries.find(d => d.id === id);
}

export function getDiaryByHash(hash: string): Diary | undefined {
  const diaries = readStorage();
  return diaries.find(d => d.shareHash === hash);
}

export function generateShareHash(id: string): string {
  const diaries = readStorage();
  const diary = diaries.find(d => d.id === id);
  if (!diary) return '';
  if (diary.shareHash) return diary.shareHash;
  const hash = generateHash();
  diary.shareHash = hash;
  writeStorage(diaries);
  return hash;
}

export function getMoodTrends(days: number = 30): MoodTrendPoint[] {
  const diaries = readStorage();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateMap = new Map<string, MoodTrendPoint>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    dateMap.set(dateStr, { date: dateStr, stars: 0, mood: 'calm' });
  }

  const diaryMap = new Map<string, Diary[]>();
  for (const diary of diaries) {
    if (dateMap.has(diary.date)) {
      if (!diaryMap.has(diary.date)) diaryMap.set(diary.date, []);
      diaryMap.get(diary.date)!.push(diary);
    }
  }

  const result: MoodTrendPoint[] = [];
  for (const [dateStr, point] of dateMap) {
    const dayDiaries = diaryMap.get(dateStr);
    if (dayDiaries && dayDiaries.length > 0) {
      const totalStars = dayDiaries.reduce((sum, d) => sum + d.stars, 0);
      const avgStars = totalStars / dayDiaries.length;
      const latestMood = dayDiaries.sort((a, b) => b.id.localeCompare(a.id))[0].mood;
      result.push({ date: dateStr, stars: avgStars, mood: latestMood });
    } else {
      result.push(point);
    }
  }

  return result;
}

export function getAvailableYears(): number[] {
  const diaries = readStorage();
  const years = new Set<number>();
  for (const d of diaries) {
    years.add(parseInt(d.date.slice(0, 4), 10));
  }
  return Array.from(years).sort((a, b) => b - a);
}

export function getStats(): { total: number; avgStars: number } {
  const diaries = readStorage();
  if (diaries.length === 0) return { total: 0, avgStars: 0 };
  const total = diaries.length;
  const sum = diaries.reduce((s, d) => s + d.stars, 0);
  return { total, avgStars: Math.round((sum / total) * 10) / 10 };
}
