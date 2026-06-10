export type EntityType = 'platform' | 'enemy' | 'spike' | 'goal';

export interface LevelEntity {
  id: string;
  type: EntityType;
  gridX: number;
  gridY: number;
}

export interface LevelData {
  entities: LevelEntity[];
}

export const GRID_COLS = 20;
export const GRID_ROWS = 15;
export const CELL_SIZE = 40;

export const CANVAS_WIDTH = GRID_COLS * CELL_SIZE;
export const CANVAS_HEIGHT = GRID_ROWS * CELL_SIZE;

export const COLORS = {
  background: '#1a1a2e',
  gridLine: '#334466',
  panel: '#16213e',
  platform: '#8B4513',
  enemy: '#ff4444',
  spike: '#666666',
  goal: '#ffd700',
  player: '#4caf50',
  warning: '#ffc107',
  success: '#4caf50'
} as const;
