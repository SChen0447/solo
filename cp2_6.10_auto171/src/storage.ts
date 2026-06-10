import { BaseElement, LaserConnection } from './elements';

export interface PuzzleLayout {
  id: string;
  name: string;
  timestamp: number;
  elements: BaseElement[];
  laserConnections: LaserConnection[];
}

const STORAGE_KEY = 'puzzle_sandbox_layouts';
const MAX_HISTORY = 5;

export function saveLayout(name: string, elements: BaseElement[], connections: LaserConnection[]): PuzzleLayout {
  const layouts = loadAllLayouts();
  const layout: PuzzleLayout = {
    id: `layout_${Date.now()}`,
    name,
    timestamp: Date.now(),
    elements: JSON.parse(JSON.stringify(elements)),
    laserConnections: JSON.parse(JSON.stringify(connections)),
  };
  layouts.unshift(layout);
  const trimmed = layouts.slice(0, MAX_HISTORY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return layout;
}

export function loadAllLayouts(): PuzzleLayout[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PuzzleLayout[];
  } catch {
    return [];
  }
}

export function loadLayout(id: string): PuzzleLayout | null {
  const layouts = loadAllLayouts();
  return layouts.find((l) => l.id === id) || null;
}

export function deleteLayout(id: string): void {
  const layouts = loadAllLayouts().filter((l) => l.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
