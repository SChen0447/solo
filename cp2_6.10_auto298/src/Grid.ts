import { v4 as uuidv4 } from 'uuid';
import {
  Rune,
  RuneElement,
  GRID_SIZE,
  CELL_SIZE,
} from './types';

export class Grid {
  private cells: (Rune | null)[][] = [];
  public offsetX: number = 0;
  public offsetY: number = 0;

  constructor(offsetX: number, offsetY: number) {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.cells = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(null));
  }

  getGridData(): (Rune | null)[][] {
    return this.cells.map(row => [...row]);
  }

  getPlacedRunes(): Rune[] {
    const runes: Rune[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.cells[y][x]) {
          runes.push(this.cells[y][x]!);
        }
      }
    }
    return runes;
  }

  isCellOccupied(gridX: number, gridY: number): boolean {
    if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) {
      return true;
    }
    return this.cells[gridY][gridX] !== null;
  }

  worldToGrid(worldX: number, worldY: number): { gridX: number; gridY: number } {
    const gridX = Math.floor((worldX - this.offsetX) / CELL_SIZE);
    const gridY = Math.floor((worldY - this.offsetY) / CELL_SIZE);
    return { gridX, gridY };
  }

  gridToWorld(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: this.offsetX + gridX * CELL_SIZE + CELL_SIZE / 2,
      y: this.offsetY + gridY * CELL_SIZE + CELL_SIZE / 2,
    };
  }

  snapToGrid(worldX: number, worldY: number): { x: number; y: number; gridX: number; gridY: number } {
    const { gridX, gridY } = this.worldToGrid(worldX, worldY);
    const clampedX = Math.max(0, Math.min(GRID_SIZE - 1, gridX));
    const clampedY = Math.max(0, Math.min(GRID_SIZE - 1, gridY));
    const world = this.gridToWorld(clampedX, clampedY);
    return {
      x: world.x,
      y: world.y,
      gridX: clampedX,
      gridY: clampedY,
    };
  }

  isInsideGrid(worldX: number, worldY: number): boolean {
    const { gridX, gridY } = this.worldToGrid(worldX, worldY);
    return gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE;
  }

  placeRune(element: RuneElement, gridX: number, gridY: number): Rune | null {
    if (this.isCellOccupied(gridX, gridY)) {
      return null;
    }
    const world = this.gridToWorld(gridX, gridY);
    const rune: Rune = {
      id: uuidv4(),
      element,
      x: world.x,
      y: world.y,
      gridX,
      gridY,
      glowIntensity: 0,
      placed: true,
      isDormant: false,
      chargeCount: 0,
      scale: 1,
      animOffset: Math.random() * Math.PI * 2,
    };
    this.cells[gridY][gridX] = rune;
    return rune;
  }

  removeRune(gridX: number, gridY: number): Rune | null {
    if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) {
      return null;
    }
    const rune = this.cells[gridY][gridX];
    this.cells[gridY][gridX] = null;
    return rune;
  }

  getRune(gridX: number, gridY: number): Rune | null {
    if (gridX < 0 || gridX >= GRID_SIZE || gridY < 0 || gridY >= GRID_SIZE) {
      return null;
    }
    return this.cells[gridY][gridX];
  }

  getNeighbors(gridX: number, gridY: number, radius: number = 1): Rune[] {
    const neighbors: Rune[] = [];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = gridX + dx;
        const ny = gridY + dy;
        const rune = this.getRune(nx, ny);
        if (rune) {
          neighbors.push(rune);
        }
      }
    }
    return neighbors;
  }

  clearAll(): void {
    this.cells = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(null));
  }

  getRuneCount(): number {
    let count = 0;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.cells[y][x]) count++;
      }
    }
    return count;
  }

  checkPattern(pattern: { dx: number; dy: number }[], startX: number, startY: number): (Rune | null)[] {
    const result: (Rune | null)[] = [];
    for (const offset of pattern) {
      const x = startX + offset.dx;
      const y = startY + offset.dy;
      result.push(this.getRune(x, y));
    }
    return result;
  }

  updateRuneAnimations(time: number): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const rune = this.cells[y][x];
        if (rune) {
          rune.glowIntensity = 0.3 + 0.2 * Math.sin(time * 0.003 + rune.animOffset);
        }
      }
    }
  }
}
