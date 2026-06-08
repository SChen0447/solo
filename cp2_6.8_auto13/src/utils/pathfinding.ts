import { Cell, Position, MAZE_WIDTH, MAZE_HEIGHT } from './gameTypes';
import { isWalkable } from './mazeGenerator';

interface Node {
  position: Position;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function positionKey(pos: Position): string {
  return `${pos.x},${pos.y}`;
}

export function findPath(
  maze: Cell[][],
  start: Position,
  end: Position,
  avoidTraps: Position[] = []
): Position[] {
  const startTime = performance.now();

  const trapSet = new Set(avoidTraps.map((t) => positionKey(t)));

  const openList: Node[] = [];
  const closedSet = new Set<string>();

  const startNode: Node = {
    position: start,
    g: 0,
    h: manhattanDistance(start, end),
    f: manhattanDistance(start, end),
    parent: null,
  };
  openList.push(startNode);

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
  ];

  while (openList.length > 0) {
    openList.sort((a, b) => a.f - b.f);
    const current = openList.shift()!;

    if (current.position.x === end.x && current.position.y === end.y) {
      const path: Position[] = [];
      let node: Node | null = current;
      while (node) {
        path.unshift(node.position);
        node = node.parent;
      }
      return path;
    }

    closedSet.add(positionKey(current.position));

    for (const dir of directions) {
      const nx = current.position.x + dir.dx;
      const ny = current.position.y + dir.dy;

      if (!isWalkable(maze, nx, ny)) continue;

      const neighborPos = { x: nx, y: ny };
      const neighborKey = positionKey(neighborPos);

      if (closedSet.has(neighborKey)) continue;

      if (trapSet.has(neighborKey)) continue;

      const g = current.g + 1;
      const h = manhattanDistance(neighborPos, end);
      const f = g + h;

      const existingNode = openList.find(
        (n) => n.position.x === nx && n.position.y === ny
      );

      if (existingNode) {
        if (g < existingNode.g) {
          existingNode.g = g;
          existingNode.f = f;
          existingNode.parent = current;
        }
      } else {
        openList.push({
          position: neighborPos,
          g,
          h,
          f,
          parent: current,
        });
      }
    }
  }

  return [];
}

export function findPathWithTimeout(
  maze: Cell[][],
  start: Position,
  end: Position,
  avoidTraps: Position[] = [],
  timeoutMs: number = 20
): { path: Position[]; timedOut: boolean; duration: number } {
  const startTime = performance.now();

  const trapSet = new Set(avoidTraps.map((t) => positionKey(t)));

  const openList: Node[] = [];
  const closedSet = new Set<string>();

  const startNode: Node = {
    position: start,
    g: 0,
    h: manhattanDistance(start, end),
    f: manhattanDistance(start, end),
    parent: null,
  };
  openList.push(startNode);

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
  ];

  let iterations = 0;

  while (openList.length > 0) {
    iterations++;

    if (iterations % 50 === 0) {
      const elapsed = performance.now() - startTime;
      if (elapsed > timeoutMs) {
        return { path: [], timedOut: true, duration: elapsed };
      }
    }

    openList.sort((a, b) => a.f - b.f);
    const current = openList.shift()!;

    if (current.position.x === end.x && current.position.y === end.y) {
      const path: Position[] = [];
      let node: Node | null = current;
      while (node) {
        path.unshift(node.position);
        node = node.parent;
      }
      const duration = performance.now() - startTime;
      return { path, timedOut: false, duration };
    }

    closedSet.add(positionKey(current.position));

    for (const dir of directions) {
      const nx = current.position.x + dir.dx;
      const ny = current.position.y + dir.dy;

      if (!isWalkable(maze, nx, ny)) continue;

      const neighborPos = { x: nx, y: ny };
      const neighborKey = positionKey(neighborPos);

      if (closedSet.has(neighborKey)) continue;

      if (trapSet.has(neighborKey)) continue;

      const g = current.g + 1;
      const h = manhattanDistance(neighborPos, end);
      const f = g + h;

      const existingNode = openList.find(
        (n) => n.position.x === nx && n.position.y === ny
      );

      if (existingNode) {
        if (g < existingNode.g) {
          existingNode.g = g;
          existingNode.f = f;
          existingNode.parent = current;
        }
      } else {
        openList.push({
          position: neighborPos,
          g,
          h,
          f,
          parent: current,
        });
      }
    }
  }

  const duration = performance.now() - startTime;
  return { path: [], timedOut: false, duration };
}
