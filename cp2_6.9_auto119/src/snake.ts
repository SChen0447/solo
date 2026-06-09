export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Point {
  x: number;
  y: number;
}

const DIRECTIONS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export class Snake {
  body: Point[];
  direction: Direction;
  nextDirection: Direction;
  color: string;
  isAI: boolean;
  growPending: number;

  constructor(startX: number, startY: number, direction: Direction, color: string) {
    this.body = [
      { x: startX, y: startY },
      { x: startX - DIRECTIONS[direction].x, y: startY - DIRECTIONS[direction].y },
      { x: startX - DIRECTIONS[direction].x * 2, y: startY - DIRECTIONS[direction].y * 2 },
    ];
    this.direction = direction;
    this.nextDirection = direction;
    this.color = color;
    this.isAI = false;
    this.growPending = 0;
  }

  get head(): Point {
    return this.body[0];
  }

  setDirection(dir: Direction): void {
    if (OPPOSITE[this.direction] !== dir) {
      this.nextDirection = dir;
    }
  }

  move(): void {
    this.direction = this.nextDirection;
    const delta = DIRECTIONS[this.direction];
    const newHead: Point = {
      x: this.head.x + delta.x,
      y: this.head.y + delta.y,
    };
    this.body.unshift(newHead);
    if (this.growPending > 0) {
      this.growPending--;
    } else {
      this.body.pop();
    }
  }

  grow(): void {
    this.growPending++;
  }

  checkSelfCollision(): boolean {
    for (let i = 1; i < this.body.length; i++) {
      if (this.body[i].x === this.head.x && this.body[i].y === this.head.y) {
        return true;
      }
    }
    return false;
  }

  checkOtherCollision(other: Snake): boolean {
    for (const seg of other.body) {
      if (seg.x === this.head.x && seg.y === this.head.y) {
        return true;
      }
    }
    return false;
  }

  occupies(x: number, y: number): boolean {
    for (const seg of this.body) {
      if (seg.x === x && seg.y === y) {
        return true;
      }
    }
    return false;
  }

  aiDecide(
    gridSize: number,
    food: Point,
    other: Snake,
    self: Snake
  ): void {
    const head = this.head;
    const target = food;

    const safeDirections: Direction[] = [];
    const towardFood: Direction[] = [];

    const allDirs: Direction[] = ['up', 'down', 'left', 'right'];

    for (const dir of allDirs) {
      if (OPPOSITE[this.direction] === dir) continue;

      const delta = DIRECTIONS[dir];
      const nx = head.x + delta.x;
      const ny = head.y + delta.y;

      if (nx < 0 || nx >= gridSize || ny < 0 || ny >= gridSize) continue;
      if (this.occupiesExceptTail(nx, ny)) continue;
      if (other.occupies(nx, ny)) continue;

      safeDirections.push(dir);

      const dxToFood = target.x - head.x;
      const dyToFood = target.y - head.y;

      let movesToward = false;
      if (dir === 'up' && dyToFood < 0) movesToward = true;
      if (dir === 'down' && dyToFood > 0) movesToward = true;
      if (dir === 'left' && dxToFood < 0) movesToward = true;
      if (dir === 'right' && dxToFood > 0) movesToward = true;

      if (movesToward) {
        towardFood.push(dir);
      }
    }

    let chosen: Direction | null = null;

    if (towardFood.length > 0) {
      chosen = towardFood[Math.floor(Math.random() * towardFood.length)];
    } else if (safeDirections.length > 0) {
      let bestDir: Direction | null = null;
      let bestSpace = -1;
      for (const dir of safeDirections) {
        const delta = DIRECTIONS[dir];
        const nx = head.x + delta.x;
        const ny = head.y + delta.y;
        const space = this.floodFillSpace(nx, ny, gridSize, this, other);
        if (space > bestSpace) {
          bestSpace = space;
          bestDir = dir;
        }
      }
      chosen = bestDir ?? safeDirections[0];
    }

    if (chosen !== null) {
      this.setDirection(chosen);
    }
  }

  private occupiesExceptTail(x: number, y: number): boolean {
    const checkEnd = this.growPending > 0 ? this.body.length : this.body.length - 1;
    for (let i = 0; i < checkEnd; i++) {
      if (this.body[i].x === x && this.body[i].y === y) {
        return true;
      }
    }
    return false;
  }

  private floodFillSpace(
    startX: number,
    startY: number,
    gridSize: number,
    self: Snake,
    other: Snake
  ): number {
    const visited = new Set<string>();
    const queue: Point[] = [{ x: startX, y: startY }];
    let count = 0;
    const maxCheck = 50;

    while (queue.length > 0 && count < maxCheck) {
      const curr = queue.shift()!;
      const key = `${curr.x},${curr.y}`;
      if (visited.has(key)) continue;
      if (curr.x < 0 || curr.x >= gridSize || curr.y < 0 || curr.y >= gridSize) continue;
      if (self.occupies(curr.x, curr.y) && !(curr.x === startX && curr.y === startY)) continue;
      if (other.occupies(curr.x, curr.y)) continue;

      visited.add(key);
      count++;

      queue.push({ x: curr.x + 1, y: curr.y });
      queue.push({ x: curr.x - 1, y: curr.y });
      queue.push({ x: curr.x, y: curr.y + 1 });
      queue.push({ x: curr.x, y: curr.y - 1 });
    }

    return count;
  }
}
