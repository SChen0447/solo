import { GRID_COLS, GRID_ROWS, Tower, gridToPixel, TOWER_CONFIGS } from './layoutManager';

export interface PathPoint {
  gridX: number;
  gridY: number;
  x: number;
  y: number;
}

interface AStarNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: AStarNode | null;
}

function heuristic(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

function getRangeOverlapCount(gridX: number, gridY: number, towers: Tower[]): number {
  let count = 0;
  const cellCenter = gridToPixel(gridX, gridY);
  for (const tower of towers) {
    const config = TOWER_CONFIGS[tower.type];
    const towerCenter = gridToPixel(tower.gridX, tower.gridY);
    const dx = cellCenter.x - towerCenter.x;
    const dy = cellCenter.y - towerCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= config.range) {
      count++;
    }
  }
  return count;
}

function getNeighbors(x: number, y: number): Array<{ x: number; y: number }> {
  const neighbors: Array<{ x: number; y: number }> = [];
  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 }
  ];
  for (const dir of dirs) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;
    if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS) {
      neighbors.push({ x: nx, y: ny });
    }
  }
  return neighbors;
}

export function findPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  towers: Tower[]
): PathPoint[] | null {
  if (startX < 0 || startX >= GRID_COLS || startY < 0 || startY >= GRID_ROWS) {
    return null;
  }
  if (endX < 0 || endX >= GRID_COLS || endY < 0 || endY >= GRID_ROWS) {
    return null;
  }

  const occupiedCells = new Set<string>();
  for (const tower of towers) {
    if (!(tower.gridX === startX && tower.gridY === startY) &&
        !(tower.gridX === endX && tower.gridY === endY)) {
      occupiedCells.add(`${tower.gridX},${tower.gridY}`);
    }
  }

  const openSet: AStarNode[] = [];
  const closedSet = new Set<string>();
  const nodeMap = new Map<string, AStarNode>();

  const startNode: AStarNode = {
    x: startX,
    y: startY,
    g: 0,
    h: heuristic(startX, startY, endX, endY),
    f: heuristic(startX, startY, endX, endY),
    parent: null
  };
  openSet.push(startNode);
  nodeMap.set(`${startX},${startY}`, startNode);

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    const currentKey = `${current.x},${current.y}`;

    if (current.x === endX && current.y === endY) {
      const path: PathPoint[] = [];
      let node: AStarNode | null = current;
      while (node) {
        const pos = gridToPixel(node.x, node.y);
        path.unshift({
          gridX: node.x,
          gridY: node.y,
          x: pos.x,
          y: pos.y
        });
        node = node.parent;
      }
      return path;
    }

    closedSet.add(currentKey);

    const neighbors = getNeighbors(current.x, current.y);
    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;

      if (closedSet.has(neighborKey)) continue;
      if (occupiedCells.has(neighborKey)) continue;

      const overlapCount = getRangeOverlapCount(neighbor.x, neighbor.y, towers);
      const moveCost = 1 + overlapCount * 0.5;

      const tentativeG = current.g + moveCost;
      const existingNode = nodeMap.get(neighborKey);

      if (!existingNode || tentativeG < existingNode.g) {
        const h = heuristic(neighbor.x, neighbor.y, endX, endY);
        const newNode: AStarNode = {
          x: neighbor.x,
          y: neighbor.y,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current
        };

        if (!existingNode) {
          openSet.push(newNode);
        }
        nodeMap.set(neighborKey, newNode);
      }
    }
  }

  return null;
}
