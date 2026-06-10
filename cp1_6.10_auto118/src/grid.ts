export const GRID_COLS = 10;
export const GRID_ROWS = 8;
export const CELL_WIDTH = 80;
export const CELL_HEIGHT = 75;
export const GRID_OFFSET_Y = 40;

export interface PathPoint {
  x: number;
  y: number;
  gridX: number;
  gridY: number;
}

interface AStarNode {
  gridX: number;
  gridY: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

export class GridManager {
  private towerPositions: Set<string> = new Set();

  private cellWeight(gridX: number, gridY: number): number {
    if (this.towerPositions.has(`${gridX},${gridY}`)) {
      return Infinity;
    }
    for (const pos of this.towerPositions) {
      const [tx, ty] = pos.split(',').map(Number);
      const dist = Math.abs(gridX - tx) + Math.abs(gridY - ty);
      if (dist <= 2) {
        return 2.5;
      }
    }
    return 1;
  }

  setTower(gridX: number, gridY: number): void {
    this.towerPositions.add(`${gridX},${gridY}`);
  }

  removeTower(gridX: number, gridY: number): void {
    this.towerPositions.delete(`${gridX},${gridY}`);
  }

  hasTower(gridX: number, gridY: number): boolean {
    return this.towerPositions.has(`${gridX},${gridY}`);
  }

  clear(): void {
    this.towerPositions.clear();
  }

  getCellCenter(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: gridX * CELL_WIDTH + CELL_WIDTH / 2,
      y: GRID_OFFSET_Y + gridY * CELL_HEIGHT + CELL_HEIGHT / 2,
    };
  }

  gridFromPixel(px: number, py: number): { gridX: number; gridY: number } | null {
    const gridX = Math.floor(px / CELL_WIDTH);
    const gridY = Math.floor((py - GRID_OFFSET_Y) / CELL_HEIGHT);
    if (gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= GRID_ROWS) {
      return null;
    }
    return { gridX, gridY };
  }

  private heuristic(a: AStarNode, b: AStarNode): number {
    return Math.abs(a.gridX - b.gridX) + Math.abs(a.gridY - b.gridY);
  }

  private getNeighbors(node: AStarNode): AStarNode[] {
    const dirs = [
      [0, -1], [0, 1], [-1, 0], [1, 0],
    ];
    const neighbors: AStarNode[] = [];
    for (const [dx, dy] of dirs) {
      const nx = node.gridX + dx;
      const ny = node.gridY + dy;
      if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) {
        const weight = this.cellWeight(nx, ny);
        if (weight < Infinity) {
          neighbors.push({
            gridX: nx,
            gridY: ny,
            g: 0,
            h: 0,
            f: 0,
            parent: null,
          });
        }
      }
    }
    return neighbors;
  }

  findPath(startY: number): PathPoint[] | null {
    const start: AStarNode = {
      gridX: 0,
      gridY: startY,
      g: 0,
      h: 0,
      f: 0,
      parent: null,
    };

    const bestEnd: AStarNode | null = this.findBestPathFromStart(start);
    if (!bestEnd) {
      return null;
    }

    const path: PathPoint[] = [];
    let current: AStarNode | null = bestEnd;
    while (current) {
      const center = this.getCellCenter(current.gridX, current.gridY);
      path.unshift({
        x: center.x,
        y: center.y,
        gridX: current.gridX,
        gridY: current.gridY,
      });
      current = current.parent;
    }
    return path;
  }

  private findBestPathFromStart(start: AStarNode): AStarNode | null {
    const openSet: AStarNode[] = [start];
    const closedSet = new Set<string>();
    const nodeMap = new Map<string, AStarNode>();
    nodeMap.set(`${start.gridX},${start.gridY}`, start);

    let bestEndNode: AStarNode | null = null;
    let bestEndX = -1;

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      const key = `${current.gridX},${current.gridY}`;
      closedSet.add(key);

      if (current.gridX > bestEndX) {
        bestEndX = current.gridX;
        bestEndNode = current;
      }

      if (current.gridX === GRID_COLS - 1) {
        return current;
      }

      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        const nKey = `${neighbor.gridX},${neighbor.gridY}`;
        if (closedSet.has(nKey)) continue;

        const tentativeG = current.g + this.cellWeight(neighbor.gridX, neighbor.gridY);
        const existing = nodeMap.get(nKey);

        if (!existing || tentativeG < existing.g) {
          neighbor.g = tentativeG;
          const dummyEnd: AStarNode = { gridX: GRID_COLS - 1, gridY: neighbor.gridY, g: 0, h: 0, f: 0, parent: null };
          neighbor.h = this.heuristic(neighbor, dummyEnd);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;
          nodeMap.set(nKey, neighbor);
          if (!existing) {
            openSet.push(neighbor);
          }
        }
      }
    }

    return bestEndNode;
  }
}
