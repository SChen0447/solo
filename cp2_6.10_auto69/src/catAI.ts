export type CatBehaviorState = 'chasing' | 'pouncing' | 'sidestepping' | 'sleeping';

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AIOutput {
  targetX: number;
  targetY: number;
  state: CatBehaviorState;
  speedMultiplier: number;
  path: { x: number; y: number }[];
}

interface GridNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: GridNode | null;
}

export class CatAI {
  private readonly gridSize = 20;
  private canvasWidth: number;
  private canvasHeight: number;
  private obstacles: Obstacle[];
  private currentPath: { x: number; y: number }[] = [];
  private pathRecalcCooldown = 0;
  private readonly pounceDistance = 30;
  private readonly speedRatio = 1 / 1.2;

  constructor(canvasWidth: number, canvasHeight: number, obstacles: Obstacle[]) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.obstacles = obstacles;
  }

  public updateObstacles(obstacles: Obstacle[]): void {
    this.obstacles = obstacles;
  }

  public updateCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public calculate(
    catX: number,
    catY: number,
    laserX: number,
    laserY: number,
    laserSpeed: number,
    isSleeping: boolean,
    deltaTime: number
  ): AIOutput {
    if (isSleeping) {
      return {
        targetX: catX,
        targetY: catY,
        state: 'sleeping',
        speedMultiplier: 0,
        path: []
      };
    }

    const distanceToLaser = Math.hypot(laserX - catX, laserY - catY);

    if (distanceToLaser <= this.pounceDistance) {
      return {
        targetX: laserX,
        targetY: laserY,
        state: 'pouncing',
        speedMultiplier: 0,
        path: []
      };
    }

    this.pathRecalcCooldown -= deltaTime;
    const needsPath = this.checkObstacleBetween(catX, catY, laserX, laserY);

    if (needsPath && (this.currentPath.length === 0 || this.pathRecalcCooldown <= 0)) {
      this.currentPath = this.findPath(catX, catY, laserX, laserY);
      this.pathRecalcCooldown = 150;
    }

    if (this.currentPath.length > 0) {
      const nextPoint = this.currentPath[0];
      const distToNext = Math.hypot(nextPoint.x - catX, nextPoint.y - catY);
      if (distToNext < this.gridSize) {
        this.currentPath.shift();
      }
      if (this.currentPath.length > 0) {
        return {
          targetX: this.currentPath[0].x,
          targetY: this.currentPath[0].y,
          state: 'sidestepping',
          speedMultiplier: 0.6,
          path: [...this.currentPath]
        };
      }
    }

    return {
      targetX: laserX,
      targetY: laserY,
      state: 'chasing',
      speedMultiplier: this.speedRatio,
      path: []
    };
  }

  private checkObstacleBetween(x1: number, y1: number, x2: number, y2: number): boolean {
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 10);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      for (const obs of this.obstacles) {
        if (px >= obs.x && px <= obs.x + obs.width &&
            py >= obs.y && py <= obs.y + obs.height) {
          return true;
        }
      }
    }
    return false;
  }

  private findPath(startX: number, startY: number, endX: number, endY: number): { x: number; y: number }[] {
    const startNode: GridNode = {
      x: Math.floor(startX / this.gridSize) * this.gridSize + this.gridSize / 2,
      y: Math.floor(startY / this.gridSize) * this.gridSize + this.gridSize / 2,
      g: 0,
      h: 0,
      f: 0,
      parent: null
    };
    startNode.h = this.heuristic(startNode.x, startNode.y, endX, endY);
    startNode.f = startNode.h;

    const endGridX = Math.floor(endX / this.gridSize) * this.gridSize + this.gridSize / 2;
    const endGridY = Math.floor(endY / this.gridSize) * this.gridSize + this.gridSize / 2;

    const openSet: GridNode[] = [startNode];
    const closedSet = new Set<string>();
    const nodeMap = new Map<string, GridNode>();
    nodeMap.set(`${startNode.x},${startNode.y}`, startNode);

    const directions = [
      { dx: 0, dy: -this.gridSize },
      { dx: this.gridSize, dy: 0 },
      { dx: 0, dy: this.gridSize },
      { dx: -this.gridSize, dy: 0 },
      { dx: this.gridSize, dy: -this.gridSize },
      { dx: this.gridSize, dy: this.gridSize },
      { dx: -this.gridSize, dy: this.gridSize },
      { dx: -this.gridSize, dy: -this.gridSize }
    ];

    let iterations = 0;
    const maxIterations = 500;

    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++;
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      const currentKey = `${current.x},${current.y}`;

      if (current.x === endGridX && current.y === endGridY) {
        return this.reconstructPath(current);
      }

      closedSet.add(currentKey);

      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const neighborKey = `${nx},${ny}`;

        if (closedSet.has(neighborKey)) continue;
        if (this.isBlocked(nx, ny)) continue;
        if (nx < 0 || nx >= this.canvasWidth || ny < 0 || ny >= this.canvasHeight) continue;

        const moveCost = (dir.dx !== 0 && dir.dy !== 0) ? 1.414 : 1;
        const tentativeG = current.g + moveCost * this.gridSize;

        let neighbor = nodeMap.get(neighborKey);
        if (!neighbor) {
          neighbor = {
            x: nx,
            y: ny,
            g: Infinity,
            h: this.heuristic(nx, ny, endX, endY),
            f: 0,
            parent: null
          };
          nodeMap.set(neighborKey, neighbor);
        }

        if (tentativeG < neighbor.g) {
          neighbor.parent = current;
          neighbor.g = tentativeG;
          neighbor.f = neighbor.g + neighbor.h;

          if (!openSet.includes(neighbor)) {
            openSet.push(neighbor);
          }
        }
      }
    }

    return [];
  }

  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    return (dx + dy) + (1.414 - 2) * Math.min(dx, dy);
  }

  private reconstructPath(node: GridNode): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    let current: GridNode | null = node;
    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }
    if (path.length > 0) {
      path.shift();
    }
    return path;
  }

  private isBlocked(x: number, y: number): boolean {
    const half = this.gridSize / 2;
    for (const obs of this.obstacles) {
      if (x + half > obs.x && x - half < obs.x + obs.width &&
          y + half > obs.y && y - half < obs.y + obs.height) {
        return true;
      }
    }
    return false;
  }
}
