import { MazeGrid, CELL_PATH } from './mazeGenerator';

export interface Point {
  x: number;
  y: number;
}

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

export class PathFinder {
  findPath(grid: MazeGrid, start: Point, end: Point): Point[] | null {
    if (!this.isWalkable(grid, start.x, start.y) || !this.isWalkable(grid, end.x, end.y)) {
      return null;
    }

    if (start.x === end.x && start.y === end.y) {
      return [{ x: start.x, y: start.y }];
    }

    const width = grid[0].length;
    const height = grid.length;

    const open: Node[] = [];
    const closedMap = new Map<string, boolean>();
    const openMap = new Map<string, Node>();

    const startNode: Node = {
      x: start.x,
      y: start.y,
      g: 0,
      h: this.heuristic(start, end),
      f: 0,
      parent: null
    };
    startNode.f = startNode.g + startNode.h;

    open.push(startNode);
    openMap.set(`${start.x},${start.y}`, startNode);

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ];

    while (open.length > 0) {
      let minIndex = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].f < open[minIndex].f) {
          minIndex = i;
        }
      }

      const current = open.splice(minIndex, 1)[0];
      const currentKey = `${current.x},${current.y}`;
      openMap.delete(currentKey);
      closedMap.set(currentKey, true);

      if (current.x === end.x && current.y === end.y) {
        return this.reconstructPath(current);
      }

      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const neighborKey = `${nx},${ny}`;

        if (!this.isWalkable(grid, nx, ny)) continue;
        if (closedMap.has(neighborKey)) continue;

        const tentativeG = current.g + 1;
        const existing = openMap.get(neighborKey);

        if (existing) {
          if (tentativeG < existing.g) {
            existing.g = tentativeG;
            existing.f = existing.g + existing.h;
            existing.parent = current;
          }
        } else {
          const neighbor: Node = {
            x: nx,
            y: ny,
            g: tentativeG,
            h: this.heuristic({ x: nx, y: ny }, end),
            f: 0,
            parent: current
          };
          neighbor.f = neighbor.g + neighbor.h;
          open.push(neighbor);
          openMap.set(neighborKey, neighbor);
        }
      }
    }

    return null;
  }

  private heuristic(a: Point, b: Point): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private reconstructPath(node: Node): Point[] {
    const path: Point[] = [];
    let current: Node | null = node;
    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }
    return path;
  }

  private isWalkable(grid: MazeGrid, x: number, y: number): boolean {
    if (y < 0 || y >= grid.length) return false;
    if (x < 0 || x >= grid[0].length) return false;
    return grid[y][x] === CELL_PATH;
  }
}
