export enum Direction {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right'
}

export interface Position {
  x: number;
  y: number;
}

export interface SnakeData {
  id: string;
  name: string;
  body: Position[];
  direction: Direction;
  color: string;
  emoji: string;
  alive: boolean;
  score: number;
}

export class Snake {
  public id: string;
  public name: string;
  public body: Position[];
  public direction: Direction;
  public nextDirection: Direction;
  public color: string;
  public emoji: string;
  public alive: boolean;
  public score: number;
  public tailParticles: TailParticle[];
  public pupilDirection: Position;

  constructor(
    id: string,
    name: string,
    body: Position[],
    color: string,
    emoji: string,
    direction: Direction = Direction.RIGHT
  ) {
    this.id = id;
    this.name = name;
    this.body = body;
    this.direction = direction;
    this.nextDirection = direction;
    this.color = color;
    this.emoji = emoji;
    this.alive = true;
    this.score = 0;
    this.tailParticles = [];
    this.pupilDirection = { x: 1, y: 0 };
    this.randomizePupil();
  }

  private randomizePupil(): void {
    const angles = [
      { x: 0.5, y: 0 },
      { x: -0.5, y: 0 },
      { x: 0, y: 0.5 },
      { x: 0, y: -0.5 },
      { x: 0.3, y: 0.3 },
      { x: -0.3, y: 0.3 },
      { x: 0.3, y: -0.3 },
      { x: -0.3, y: -0.3 }
    ];
    const angle = angles[Math.floor(Math.random() * angles.length)];
    this.pupilDirection = angle;
  }

  public grow(): void {
    const tail = this.body[this.body.length - 1];
    this.body.push({ ...tail });
  }

  public checkSelfCollision(): boolean {
    if (this.body.length < 4) return false;
    const head = this.body[0];
    for (let i = 1; i < this.body.length; i++) {
      if (head.x === this.body[i].x && head.y === this.body[i].y) {
        return true;
      }
    }
    return false;
  }

  public checkWallCollision(arenaWidth: number, arenaHeight: number): boolean {
    const head = this.body[0];
    return head.x < 0 || head.x >= arenaWidth || head.y < 0 || head.y >= arenaHeight;
  }

  public checkSnakeCollision(other: Snake): boolean {
    if (!this.alive || !other.alive) return false;
    const head = this.body[0];
    for (const segment of other.body) {
      if (head.x === segment.x && head.y === segment.y) {
        return true;
      }
    }
    return false;
  }

  public addTailParticle(x: number, y: number, cellSize: number): void {
    this.tailParticles.push({
      x: x + cellSize / 2,
      y: y + cellSize / 2,
      size: cellSize / 3,
      alpha: 0.8,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2
    });
  }

  public updateTailParticles(): void {
    for (let i = this.tailParticles.length - 1; i >= 0; i--) {
      const p = this.tailParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.size *= 0.95;
      p.alpha -= 0.03;
      if (p.alpha <= 0 || p.size < 1) {
        this.tailParticles.splice(i, 1);
      }
    }
  }

  public updateFromData(data: SnakeData): void {
    const oldTail = this.body.length > 0 ? this.body[this.body.length - 1] : null;
    
    this.body = data.body;
    this.direction = data.direction as Direction;
    this.color = data.color;
    this.emoji = data.emoji;
    this.alive = data.alive;
    this.score = data.score;

    if (oldTail && data.body.length > 0) {
      const newTail = data.body[data.body.length - 1];
      if (oldTail.x !== newTail.x || oldTail.y !== newTail.y) {
        const cellSize = 20;
        this.addTailParticle(oldTail.x, oldTail.y, cellSize);
      }
    }
  }
}

export interface TailParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  vx: number;
  vy: number;
}

export function darkenColor(hex: string, amount: number = 0.3): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const newR = Math.floor(r * (1 - amount));
  const newG = Math.floor(g * (1 - amount));
  const newB = Math.floor(b * (1 - amount));
  
  return `rgb(${newR}, ${newG}, ${newB})`;
}

export function lightenColor(hex: string, amount: number = 0.3): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const newR = Math.min(255, Math.floor(r + (255 - r) * amount));
  const newG = Math.min(255, Math.floor(g + (255 - g) * amount));
  const newB = Math.min(255, Math.floor(b + (255 - b) * amount));
  
  return `rgb(${newR}, ${newG}, ${newB})`;
}
