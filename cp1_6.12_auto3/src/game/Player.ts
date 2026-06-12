export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Point {
  x: number;
  y: number;
}

export interface PlayerConfig {
  id: string;
  name: string;
  color: string;
  startX: number;
  startY: number;
  controls: {
    up: string[];
    down: string[];
    left: string[];
    right: string[];
  };
}

export class Player {
  public readonly id: string;
  public readonly name: string;
  public readonly color: string;
  public readonly controls: PlayerConfig['controls'];

  public x: number;
  public y: number;
  public direction: Direction = 'right';
  public pendingDirection: Direction = 'right';

  public trail: Point[] = [];
  public trailLength: number = 0;
  public coveredPixels: Set<string> = new Set();
  public areaScore: number = 0;

  public readonly moveSpeed: number = 3.2;
  public readonly brushSize: number = 5;

  private readonly minTurnDistance: number = 6;
  private lastTurnPoint: Point;

  constructor(config: PlayerConfig) {
    this.id = config.id;
    this.name = config.name;
    this.color = config.color;
    this.controls = config.controls;
    this.x = config.startX;
    this.y = config.startY;
    this.lastTurnPoint = { x: config.startX, y: config.startY };
    this.trail.push({ x: config.startX, y: config.startY });
  }

  public setDirection(dir: Direction): void {
    if (this.isOpposite(dir, this.direction)) return;
    this.pendingDirection = dir;
  }

  private isOpposite(a: Direction, b: Direction): boolean {
    return (
      (a === 'up' && b === 'down') ||
      (a === 'down' && b === 'up') ||
      (a === 'left' && b === 'right') ||
      (a === 'right' && b === 'left')
    );
  }

  public update(canvasW: number, canvasH: number): void {
    const dist = this.distance(this.lastTurnPoint, { x: this.x, y: this.y });
    if (dist >= this.minTurnDistance && this.pendingDirection !== this.direction) {
      if (!this.isOpposite(this.pendingDirection, this.direction)) {
        this.direction = this.pendingDirection;
        this.trail.push({ x: this.x, y: this.y });
        this.lastTurnPoint = { x: this.x, y: this.y };
      }
    }

    const prev = { x: this.x, y: this.y };

    switch (this.direction) {
      case 'up':    this.y -= this.moveSpeed; break;
      case 'down':  this.y += this.moveSpeed; break;
      case 'left':  this.x -= this.moveSpeed; break;
      case 'right': this.x += this.moveSpeed; break;
    }

    const half = this.brushSize / 2 + 1;
    this.x = Math.max(half, Math.min(canvasW - half, this.x));
    this.y = Math.max(half, Math.min(canvasH - half, this.y));

    const moved = this.distance(prev, { x: this.x, y: this.y });
    if (moved > 0) {
      this.trailLength += moved;
      this.addCoveredPixels(prev, { x: this.x, y: this.y });
    }
  }

  private distance(a: Point, b: Point): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private addCoveredPixels(from: Point, to: Point): void {
    const steps = Math.ceil(Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)));
    const r = Math.floor(this.brushSize / 2);
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      const cx = Math.round(from.x + (to.x - from.x) * t);
      const cy = Math.round(from.y + (to.y - from.y) * t);
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dy * dy <= r * r) {
            this.coveredPixels.add(`${cx + dx},${cy + dy}`);
          }
        }
      }
    }
    this.areaScore = this.coveredPixels.size;
  }

  public getTotalScore(): number {
    return Math.floor(this.trailLength) + this.areaScore;
  }

  public reset(startX: number, startY: number, direction: Direction): void {
    this.x = startX;
    this.y = startY;
    this.direction = direction;
    this.pendingDirection = direction;
    this.trail = [{ x: startX, y: startY }];
    this.trailLength = 0;
    this.coveredPixels.clear();
    this.areaScore = 0;
    this.lastTurnPoint = { x: startX, y: startY };
  }
}
