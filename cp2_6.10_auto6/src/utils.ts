export type Quadrant = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type Priority = 'high' | 'medium' | 'low';

export interface TodoItem {
  id: string;
  title: string;
  description: string;
  quadrant: Quadrant;
  priority: Priority;
  dueDate: string;
  completed: boolean;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppEventMap {
  'items:changed': TodoItem[];
  'notes:changed': Note[];
  'view:change': 'board' | 'calendar';
  'item:completed': { id: string; completed: boolean };
}

export function formatDate(date: Date | number | string, format: string = 'YYYY-MM-DD'): string {
  const d = typeof date === 'number' ? new Date(date) : typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes);
}

export function formatRelative(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`;
  return formatDate(timestamp, 'MM-DD');
}

export function isToday(dateStr: string): boolean {
  return dateStr === formatDate(new Date(), 'YYYY-MM-DD');
}

export function isOverdue(dateStr: string): boolean {
  if (!dateStr) return false;
  const today = formatDate(new Date(), 'YYYY-MM-DD');
  return dateStr < today;
}

export function getDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return formatDate(d, 'YYYY-MM-DD');
}

const STORAGE_PREFIX = 'productivity_';
const memoryCache: Record<string, unknown> = {};

export function storage<T>(key: string, value?: T): T | null {
  const fullKey = STORAGE_PREFIX + key;
  if (value !== undefined) {
    try {
      const serialized = JSON.stringify(value);
      memoryCache[fullKey] = value;
      localStorage.setItem(fullKey, serialized);
      return value;
    } catch {
      return null;
    }
  }
  if (fullKey in memoryCache) {
    return memoryCache[fullKey] as T;
  }
  try {
    const raw = localStorage.getItem(fullKey);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as T;
    memoryCache[fullKey] = parsed;
    return parsed;
  } catch {
    return null;
  }
}

let writeTimers: Record<string, ReturnType<typeof setTimeout>> = {};

export function debouncedStorage<T>(key: string, value: T, delay: number = 200): void {
  const fullKey = STORAGE_PREFIX + key;
  memoryCache[fullKey] = value;
  if (writeTimers[fullKey]) clearTimeout(writeTimers[fullKey]);
  writeTimers[fullKey] = setTimeout(() => {
    try {
      localStorage.setItem(fullKey, JSON.stringify(value));
    } catch {
      /* ignore */
    }
    delete writeTimers[fullKey];
  }, delay);
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, wait: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (this: unknown, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  } as T;
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function $<T extends HTMLElement = HTMLElement>(selector: string, parent: Document | HTMLElement = document): T | null {
  return parent.querySelector(selector) as T | null;
}

export function $$<T extends HTMLElement = HTMLElement>(selector: string, parent: Document | HTMLElement = document): T[] {
  return Array.from(parent.querySelectorAll(selector)) as T[];
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string | boolean | undefined | null>,
  children?: Array<HTMLElement | string | null | undefined>
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (v === true) node.setAttribute(k, '');
      else node.setAttribute(k, String(v));
    }
  }
  if (children) {
    for (const child of children) {
      if (child === null || child === undefined) continue;
      if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
  }
  return node;
}

export class EventBus {
  private listeners: Map<keyof AppEventMap, Set<(data: unknown) => void>> = new Map();

  on<K extends keyof AppEventMap>(event: K, callback: (data: AppEventMap[K]) => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback as (data: unknown) => void);
  }

  off<K extends keyof AppEventMap>(event: K, callback: (data: AppEventMap[K]) => void): void {
    this.listeners.get(event)?.delete(callback as (data: unknown) => void);
  }

  emit<K extends keyof AppEventMap>(event: K, data: AppEventMap[K]): void {
    this.listeners.get(event)?.forEach((cb) => {
      try { cb(data); } catch { /* ignore */ }
    });
  }
}

export const bus = new EventBus();

export function priorityLabel(p: Priority): string {
  return p === 'high' ? '高' : p === 'medium' ? '中' : '低';
}

export function quadrantLabel(q: Quadrant): string {
  const map: Record<Quadrant, string> = {
    Q1: '紧急且重要',
    Q2: '重要不紧急',
    Q3: '紧急不重要',
    Q4: '不重要不紧急'
  };
  return map[q];
}

export function getMonthMatrix(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) currentWeek.push(null);
  for (let d = 1; d <= lastDay; d++) {
    currentWeek.push(new Date(year, month, d));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }
  return weeks;
}
