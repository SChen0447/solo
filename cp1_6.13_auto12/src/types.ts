export interface MindNode {
  id: string;
  text: string;
  x: number;
  y: number;
  parentId: string | null;
  color: string;
  collapsed: boolean;
  width: number;
  height: number;
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
}

export interface Snapshot {
  id: string;
  timestamp: number;
  nodes: MindNode[];
  connections: Connection[];
  name: string;
}

export interface HistoryState {
  nodes: MindNode[];
  connections: Connection[];
}

export const THEME_COLORS = [
  '#4A90D9',
  '#9B59B6',
  '#E91E63',
  '#2ECC71',
  '#F39C12',
  '#E74C3C',
  '#1ABC9C',
  '#34495E'
];

export const LEVEL_COLORS: Record<number, string> = {
  0: '#4A90D9',
  1: '#9B59B6',
  2: '#E91E63'
};

export function getLevelColor(level: number): string {
  return LEVEL_COLORS[level] || LEVEL_COLORS[2];
}
