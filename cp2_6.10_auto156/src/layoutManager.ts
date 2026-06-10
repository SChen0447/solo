import _ from 'lodash';

export const GRID_SIZE = 40;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const GRID_COLS = CANVAS_WIDTH / GRID_SIZE;
export const GRID_ROWS = CANVAS_HEIGHT / GRID_SIZE;

export type TowerType = 'machinegun' | 'cannon' | 'laser';

export interface TowerConfig {
  type: TowerType;
  name: string;
  range: number;
  damage: number;
  fireRate: number;
  slowEffect: number;
  color: string;
}

export interface Tower {
  id: string;
  type: TowerType;
  gridX: number;
  gridY: number;
  placedAt: number;
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  machinegun: {
    type: 'machinegun',
    name: '机枪',
    range: 120,
    damage: 10,
    fireRate: 8,
    slowEffect: 0,
    color: '#e74c3c'
  },
  cannon: {
    type: 'cannon',
    name: '加农炮',
    range: 180,
    damage: 25,
    fireRate: 2,
    slowEffect: 0.1,
    color: '#3498db'
  },
  laser: {
    type: 'laser',
    name: '激光',
    range: 250,
    damage: 50,
    fireRate: 4,
    slowEffect: 0.3,
    color: '#2ecc71'
  }
};

export class LayoutManager {
  private towers: Map<string, Tower> = new Map();
  private selectedTowerId: string | null = null;

  addTower(type: TowerType, gridX: number, gridY: number): Tower | null {
    if (this.isCellOccupied(gridX, gridY)) {
      return null;
    }
    if (gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= GRID_ROWS) {
      return null;
    }
    const id = `tower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tower: Tower = {
      id,
      type,
      gridX,
      gridY,
      placedAt: performance.now()
    };
    this.towers.set(id, tower);
    return tower;
  }

  removeTower(id: string): boolean {
    if (this.selectedTowerId === id) {
      this.selectedTowerId = null;
    }
    return this.towers.delete(id);
  }

  getTower(id: string): Tower | undefined {
    return this.towers.get(id);
  }

  getAllTowers(): Tower[] {
    return Array.from(this.towers.values());
  }

  getTowerAt(gridX: number, gridY: number): Tower | undefined {
    return _.find(Array.from(this.towers.values()), t => t.gridX === gridX && t.gridY === gridY);
  }

  isCellOccupied(gridX: number, gridY: number): boolean {
    return this.getTowerAt(gridX, gridY) !== undefined;
  }

  selectTower(id: string | null): void {
    this.selectedTowerId = id;
  }

  getSelectedTower(): Tower | undefined {
    return this.selectedTowerId ? this.towers.get(this.selectedTowerId) : undefined;
  }

  getSelectedTowerId(): string | null {
    return this.selectedTowerId;
  }

  moveTower(id: string, newGridX: number, newGridY: number): boolean {
    const tower = this.towers.get(id);
    if (!tower) return false;
    if (this.isCellOccupied(newGridX, newGridY) && !(tower.gridX === newGridX && tower.gridY === newGridY)) {
      return false;
    }
    if (newGridX < 0 || newGridX >= GRID_COLS || newGridY < 0 || newGridY >= GRID_ROWS) {
      return false;
    }
    tower.gridX = newGridX;
    tower.gridY = newGridY;
    tower.placedAt = performance.now();
    return true;
  }

  getOccupiedCells(): Set<string> {
    const cells = new Set<string>();
    this.towers.forEach(tower => {
      cells.add(`${tower.gridX},${tower.gridY}`);
    });
    return cells;
  }

  clearAll(): void {
    this.towers.clear();
    this.selectedTowerId = null;
  }
}

export function gridToPixel(gridX: number, gridY: number): { x: number; y: number } {
  return {
    x: gridX * GRID_SIZE + GRID_SIZE / 2,
    y: gridY * GRID_SIZE + GRID_SIZE / 2
  };
}

export function pixelToGrid(pixelX: number, pixelY: number): { gridX: number; gridY: number } {
  return {
    gridX: Math.floor(pixelX / GRID_SIZE),
    gridY: Math.floor(pixelY / GRID_SIZE)
  };
}
