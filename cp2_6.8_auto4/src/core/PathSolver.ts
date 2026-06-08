import type { HexCoord, PathNode, CellType } from '../types';

const GRID_WIDTH = 12;
const GRID_HEIGHT = 10;

export class PathSolver {
  private grid: CellType[][];
  private width: number;
  private height: number;

  constructor(grid: CellType[][]) {
    this.grid = grid;
    this.height = grid.length;
    this.width = grid[0]?.length || 0;
  }

  static generateGrid(width: number = GRID_WIDTH, height: number = GRID_HEIGHT, obstacleRatio: number = 0.2): CellType[][] {
    const grid: CellType[][] = [];
    for (let y = 0; y < height; y++) {
      const row: CellType[] = [];
      for (let x = 0; x < width; x++) {
        row.push(Math.random() < obstacleRatio ? 'obstacle' : 'grass');
      }
      grid.push(row);
    }
    return grid;
  }

  private getNeighbors(coord: HexCoord): HexCoord[] {
    const { x, y } = coord;
    const isOddRow = y % 2 === 1;
    const neighbors: HexCoord[] = [];

    const directions = isOddRow
      ? [
          { dx: 1, dy: 0 },
          { dx: 0, dy: -1 },
          { dx: -1, dy: -1 },
          { dx: -1, dy: 0 },
          { dx: -1, dy: 1 },
          { dx: 0, dy: 1 },
        ]
      : [
          { dx: 1, dy: 0 },
          { dx: 1, dy: -1 },
          { dx: 0, dy: -1 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 1, dy: 1 },
        ];

    for (const { dx, dy } of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
        if (this.grid[ny][nx] !== 'obstacle') {
          neighbors.push({ x: nx, y: ny });
        }
      }
    }

    return neighbors;
  }

  private heuristic(a: HexCoord, b: HexCoord): number {
    const ax = a.x - (a.y - (a.y & 1)) / 2;
    const az = a.y;
    const ay = -ax - az;

    const bx = b.x - (b.y - (b.y & 1)) / 2;
    const bz = b.y;
    const by = -bx - bz;

    return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
  }

  public findPath(start: HexCoord, end: HexCoord): PathNode[] | null {
    if (this.grid[start.y]?.[start.x] === 'obstacle') return null;
    if (this.grid[end.y]?.[end.x] === 'obstacle') return null;

    interface Node {
      coord: HexCoord;
      g: number;
      h: number;
      f: number;
      parent: Node | null;
    }

    const openSet: Node[] = [];
    const closedSet = new Set<string>();
    const nodeMap = new Map<string, Node>();

    const startNode: Node = {
      coord: start,
      g: 0,
      h: this.heuristic(start, end),
      f: this.heuristic(start, end),
      parent: null,
    };

    openSet.push(startNode);
    nodeMap.set(`${start.x},${start.y}`, startNode);

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      const currentKey = `${current.coord.x},${current.coord.y}`;

      if (current.coord.x === end.x && current.coord.y === end.y) {
        const path: PathNode[] = [];
        let node: Node | null = current;
        while (node) {
          path.unshift({ x: node.coord.x, y: node.coord.y, weight: 1 });
          node = node.parent;
        }
        return this.smoothPath(path);
      }

      closedSet.add(currentKey);

      for (const neighbor of this.getNeighbors(current.coord)) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;
        if (closedSet.has(neighborKey)) continue;

        const tentativeG = current.g + 1;
        const existing = nodeMap.get(neighborKey);

        if (!existing || tentativeG < existing.g) {
          const h = this.heuristic(neighbor, end);
          const node: Node = {
            coord: neighbor,
            g: tentativeG,
            h,
            f: tentativeG + h,
            parent: current,
          };

          if (!existing) {
            openSet.push(node);
          } else {
            const idx = openSet.indexOf(existing);
            if (idx !== -1) openSet[idx] = node;
          }
          nodeMap.set(neighborKey, node);
        }
      }
    }

    return null;
  }

  private smoothPath(path: PathNode[]): PathNode[] {
    if (path.length <= 2) return path;

    const smoothed: PathNode[] = [path[0]];
    let i = 0;

    while (i < path.length - 1) {
      let j = path.length - 1;
      let found = false;

      while (j > i + 1) {
        if (this.hasLineOfSight(path[i], path[j])) {
          smoothed.push(path[j]);
          i = j;
          found = true;
          break;
        }
        j--;
      }

      if (!found) {
        smoothed.push(path[i + 1]);
        i++;
      }
    }

    return smoothed;
  }

  private hasLineOfSight(a: HexCoord, b: HexCoord): boolean {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    if (steps === 0) return true;

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = Math.round(a.x + dx * t);
      const y = Math.round(a.y + dy * t);

      if (y < 0 || y >= this.height || x < 0 || x >= this.width) return false;
      if (this.grid[y][x] === 'obstacle') return false;
    }

    return true;
  }
}
