import type { AromaHistoryItem } from '@/types';

const HISTORY_KEY = 'aroma_history';

export function saveToHistory(item: AromaHistoryItem): void {
  try {
    const history = getHistory();
    history.unshift(item);
    const trimmed = history.slice(0, 20);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save history:', e);
  }
}

export function getHistory(): AromaHistoryItem[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to get history:', e);
    return [];
  }
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function getNoteLabel(note: 'top' | 'middle' | 'base'): string {
  const labels = {
    top: '前调',
    middle: '中调',
    base: '后调',
  };
  return labels[note];
}

export function mixColors(colors: { color: string; ratio: number }[]): string {
  if (colors.length === 0) return '#b87333';

  let totalRatio = 0;
  let r = 0,
    g = 0,
    b = 0;

  colors.forEach(({ color, ratio }) => {
    const rgb = hexToRgb(color);
    if (rgb) {
      r += rgb.r * ratio;
      g += rgb.g * ratio;
      b += rgb.b * ratio;
      totalRatio += ratio;
    }
  });

  if (totalRatio === 0) return '#b87333';

  r = Math.round(r / totalRatio);
  g = Math.round(g / totalRatio);
  b = Math.round(b / totalRatio);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
