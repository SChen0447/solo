import { Position, CELL_SIZE, MAX_TRAIL_POINTS } from './maze';

export interface TrailPoint {
  x: number;
  y: number;
  createdAt: number;
}

export class Player {
  public gridPos: Position;
  public glowPhase: number = 0;
  private trail: TrailPoint[] = [];
  private keys: Set<string> = new Set();
  private moveCooldown: number = 0;
  private readonly MOVE_INTERVAL: number = 120;

  constructor(startPos: Position) {
    this.gridPos = { ...startPos };
    this.setupKeyListeners();
  }

  private setupKeyListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        e.preventDefault();
        this.keys.add(e.key.toLowerCase());
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  public update(
    deltaTime: number,
    currentTime: number,
    isWalkable: (x: number, y: number) => boolean,
    onMove: (newPos: Position) => void
  ): void {
    this.glowPhase += deltaTime * 0.003;
    this.moveCooldown -= deltaTime;

    if (this.moveCooldown <= 0) {
      let dx = 0;
      let dy = 0;

      if (this.keys.has('arrowup') || this.keys.has('w')) dy = -1;
      else if (this.keys.has('arrowdown') || this.keys.has('s')) dy = 1;
      else if (this.keys.has('arrowleft') || this.keys.has('a')) dx = -1;
      else if (this.keys.has('arrowright') || this.keys.has('d')) dx = 1;

      if (dx !== 0 || dy !== 0) {
        const newX = this.gridPos.x + dx;
        const newY = this.gridPos.y + dy;

        if (isWalkable(newX, newY)) {
          this.gridPos.x = newX;
          this.gridPos.y = newY;
          this.addTrailPoint(currentTime);
          this.moveCooldown = this.MOVE_INTERVAL;
          onMove(this.gridPos);
        }
      }
    }

    this.cleanupTrail(currentTime);
  }

  private addTrailPoint(currentTime: number): void {
    this.trail.push({
      x: this.gridPos.x,
      y: this.gridPos.y,
      createdAt: currentTime
    });

    if (this.trail.length > MAX_TRAIL_POINTS) {
      this.trail.shift();
    }
  }

  private cleanupTrail(currentTime: number): void {
    const THREE_SECONDS = 3000;
    while (this.trail.length > 0 && currentTime - this.trail[0].createdAt > THREE_SECONDS) {
      this.trail.shift();
    }
  }

  public getTrail(): TrailPoint[] {
    return this.trail;
  }

  public reset(startPos: Position): void {
    this.gridPos = { ...startPos };
    this.trail = [];
    this.moveCooldown = 0;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number,
    currentTime: number
  ): void {
    this.renderTrail(ctx, offsetX, offsetY, currentTime);
    this.renderPlayer(ctx, offsetX, offsetY);
  }

  private renderTrail(
    ctx: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number,
    currentTime: number
  ): void {
    if (this.trail.length < 2) return;

    const THREE_SECONDS = 3000;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < this.trail.length; i++) {
      const prev = this.trail[i - 1];
      const curr = this.trail[i];

      const age = currentTime - curr.createdAt;
      const progress = Math.min(age / THREE_SECONDS, 1);
      const opacity = 0.9 * (1 - progress);

      const prevX = offsetX + prev.x * CELL_SIZE + CELL_SIZE / 2;
      const prevY = offsetY + prev.y * CELL_SIZE + CELL_SIZE / 2;
      const currX = offsetX + curr.x * CELL_SIZE + CELL_SIZE / 2;
      const currY = offsetY + curr.y * CELL_SIZE + CELL_SIZE / 2;

      ctx.shadowColor = '#3498db';
      ctx.shadowBlur = 8 * (1 - progress);
      ctx.strokeStyle = `rgba(52, 152, 219, ${opacity})`;
      ctx.lineWidth = 4;

      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(currX, currY);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
  }

  private renderPlayer(
    ctx: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number
  ): void {
    const px = offsetX + this.gridPos.x * CELL_SIZE + CELL_SIZE / 2;
    const py = offsetY + this.gridPos.y * CELL_SIZE + CELL_SIZE / 2;

    const glowIntensity = 0.4 + 0.4 * (0.5 + 0.5 * Math.sin(this.glowPhase));
    const glowRadius = 30;

    const glowGradient = ctx.createRadialGradient(px, py, 0, px, py, glowRadius);
    glowGradient.addColorStop(0, `rgba(241, 196, 15, ${glowIntensity * 0.6})`);
    glowGradient.addColorStop(0.5, `rgba(241, 196, 15, ${glowIntensity * 0.3})`);
    glowGradient.addColorStop(1, 'rgba(241, 196, 15, 0)');

    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(px, py, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    const playerGradient = ctx.createRadialGradient(px, py, 0, px, py, 10);
    playerGradient.addColorStop(0, '#ffffff');
    playerGradient.addColorStop(0.6, '#fff5a0');
    playerGradient.addColorStop(1, '#f1c40f');

    ctx.shadowColor = '#f1c40f';
    ctx.shadowBlur = 15;
    ctx.fillStyle = playerGradient;
    ctx.beginPath();
    ctx.arc(px, py, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }
}
