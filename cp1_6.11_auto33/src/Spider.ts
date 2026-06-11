import { Direction, DIR_UP, Grid, MoveResult, MoveEvent } from './Grid';

export type CommandType = 'forward' | 'turnLeft' | 'turnRight';

export interface Command {
  id: string;
  type: CommandType;
}

export interface SpiderListeners {
  onCollect?: (x: number, y: number) => void;
  onHurt?: (x: number, y: number) => void;
  onError?: (x: number, y: number) => void;
  onStepDone?: () => void;
}

type AnimState = 'idle' | 'moving' | 'turning' | 'error' | 'celebrate';

export class Spider {
  gridX: number;
  gridY: number;
  direction: Direction;
  lives: number;
  animFrame: number;
  animState: AnimState;
  renderX: number;
  renderY: number;
  renderDir: number;
  prevX: number;
  prevY: number;
  prevDir: number;
  targetX: number;
  targetY: number;
  targetDir: number;
  animProgress: number;
  animDuration: number;
  errorFlashTime: number;
  shakeTime: number;
  celebrateTime: number;
  private _grid: Grid;
  private _listeners: SpiderListeners;

  constructor(
    grid: Grid,
    startX: number = 0,
    startY: number = 0,
    listeners: SpiderListeners = {},
  ) {
    this._grid = grid;
    this.gridX = startX;
    this.gridY = startY;
    this.direction = DIR_UP;
    this.lives = 3;
    this.animFrame = 0;
    this.animState = 'idle';
    this.renderX = startX;
    this.renderY = startY;
    this.renderDir = 0;
    this.prevX = startX;
    this.prevY = startY;
    this.prevDir = 0;
    this.targetX = startX;
    this.targetY = startY;
    this.targetDir = 0;
    this.animProgress = 0;
    this.animDuration = 400;
    this.errorFlashTime = 0;
    this.shakeTime = 0;
    this.celebrateTime = 0;
    this._listeners = listeners;
  }

  reset(x: number, y: number): void {
    this.gridX = x;
    this.gridY = y;
    this.direction = DIR_UP;
    this.lives = 3;
    this.renderX = x;
    this.renderY = y;
    this.renderDir = 0;
    this.prevX = x;
    this.prevY = y;
    this.prevDir = 0;
    this.targetX = x;
    this.targetY = y;
    this.targetDir = 0;
    this.animState = 'idle';
    this.animProgress = 0;
    this.errorFlashTime = 0;
    this.shakeTime = 0;
    this.celebrateTime = 0;
  }

  setListeners(listeners: SpiderListeners): void {
    this._listeners = { ...this._listeners, ...listeners };
  }

  isBusy(): boolean {
    return this.animState !== 'idle' && this.animState !== 'celebrate';
  }

  triggerCelebrate(): void {
    this.animState = 'celebrate';
    this.celebrateTime = 0;
  }

  execute(cmd: Command): Promise<MoveEvent> {
    return new Promise((resolve) => {
      if (this.isBusy()) {
        resolve('none');
        return;
      }
      if (cmd.type === 'turnLeft' || cmd.type === 'turnRight') {
        const delta = cmd.type === 'turnLeft' ? -1 : 1;
        this.prevDir = this.renderDir;
        this.targetDir = this.prevDir + delta * (Math.PI / 2);
        const newDir = ((this.direction + delta + 4) % 4);
        this.direction = newDir as Direction;
        this.animState = 'turning';
        this.animProgress = 0;
        this.animDuration = 250;
        const startTs = performance.now();
        const tick = () => {
          const elapsed = performance.now() - startTs;
          if (elapsed >= this.animDuration) {
            this.renderDir = this.targetDir;
            this.animState = 'idle';
            this._listeners.onStepDone?.();
            resolve('none');
          } else {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      } else {
        const result: MoveResult = this._grid.validateMove(
          this.gridX,
          this.gridY,
          this.direction,
        );
        if (!result.success) {
          this.animState = 'error';
          this.errorFlashTime = 350;
          this.shakeTime = 350;
          const startTs = performance.now();
          const tick = () => {
            const elapsed = performance.now() - startTs;
            if (elapsed >= 350) {
              this.animState = 'idle';
              this._listeners.onError?.(this.gridX, this.gridY);
              this._listeners.onStepDone?.();
              resolve('wall');
            } else {
              requestAnimationFrame(tick);
            }
          };
          requestAnimationFrame(tick);
          return;
        }
        this.prevX = this.gridX;
        this.prevY = this.gridY;
        this.targetX = result.newX;
        this.targetY = result.newY;
        this.animState = 'moving';
        this.animProgress = 0;
        this.animDuration = 400;
        const startTs = performance.now();
        const tick = () => {
          const elapsed = performance.now() - startTs;
          if (elapsed >= this.animDuration) {
            this.gridX = result.newX;
            this.gridY = result.newY;
            this.renderX = result.newX;
            this.renderY = result.newY;
            this.animState = 'idle';
            if (result.event === 'core') {
              this._grid.collectCore(result.newX, result.newY);
              this._listeners.onCollect?.(result.newX, result.newY);
            } else if (result.event === 'vent') {
              this.lives = Math.max(0, this.lives - 1);
              this._listeners.onHurt?.(result.newX, result.newY);
            }
            this._listeners.onStepDone?.();
            resolve(result.event);
          } else {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      }
    });
  }

  update(deltaTime: number, time: number): void {
    this.animFrame = time;
    if (this.animState === 'moving') {
      this.animProgress = Math.min(1, this.animProgress + deltaTime / this.animDuration);
      const t = this._easeInOut(this.animProgress);
      this.renderX = this.prevX + (this.targetX - this.prevX) * t;
      this.renderY = this.prevY + (this.targetY - this.prevY) * t;
    } else if (this.animState === 'turning') {
      this.animProgress = Math.min(1, this.animProgress + deltaTime / this.animDuration);
      const t = this._easeInOut(this.animProgress);
      this.renderDir = this.prevDir + (this.targetDir - this.prevDir) * t;
    }
    if (this.errorFlashTime > 0) this.errorFlashTime = Math.max(0, this.errorFlashTime - deltaTime);
    if (this.shakeTime > 0) this.shakeTime = Math.max(0, this.shakeTime - deltaTime);
    if (this.animState === 'celebrate') {
      this.celebrateTime += deltaTime;
    }
  }

  private _easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  render(
    ctx: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number,
    cellSize: number,
    time: number,
  ): void {
    const cx = offsetX + this.renderX * cellSize + cellSize / 2;
    const cy = offsetY + this.renderY * cellSize + cellSize / 2;
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeTime > 0) {
      shakeX = (Math.random() - 0.5) * 8;
      shakeY = (Math.random() - 0.5) * 8;
    }
    ctx.save();
    ctx.translate(cx + shakeX, cy + shakeY);
    if (this.animState === 'celebrate') {
      ctx.rotate(this.celebrateTime * 0.006);
    } else {
      ctx.rotate(this.renderDir);
    }

    const bodyR = cellSize * 0.25;

    this._drawLegs(ctx, bodyR, time);
    this._drawBody(ctx, bodyR, time);
    this._drawEyes(ctx, bodyR);

    if (this.errorFlashTime > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(255, 40, 40, ${(this.errorFlashTime / 350) * 0.6})`;
      ctx.beginPath();
      ctx.arc(0, 0, bodyR * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private _drawLegs(
    ctx: CanvasRenderingContext2D,
    bodyR: number,
    time: number,
  ): void {
    const gait =
      this.animState === 'moving' || this.animState === 'celebrate'
        ? Math.sin(time * 0.02)
        : 0;
    const legConfigs: Array<{ angle: number; side: number }> = [
      { angle: -Math.PI / 2.5, side: -1 },
      { angle: -Math.PI / 6, side: -1 },
      { angle: Math.PI / 6, side: -1 },
      { angle: Math.PI / 2.5, side: -1 },
      { angle: -Math.PI / 2.5, side: 1 },
      { angle: -Math.PI / 6, side: 1 },
      { angle: Math.PI / 6, side: 1 },
      { angle: Math.PI / 2.5, side: 1 },
    ];
    ctx.strokeStyle = '#4a3828';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < legConfigs.length; i++) {
      const { angle, side } = legConfigs[i];
      const phase = (i % 2 === 0 ? gait : -gait) * 0.35;
      const baseX = Math.cos(angle) * bodyR * 0.75;
      const baseY = side * bodyR * 0.3;
      const midX = baseX + Math.cos(angle) * bodyR * 0.6;
      const midY = side * bodyR * 1.05 + phase * 0.5;
      const tipX = baseX + Math.cos(angle + 0.3) * bodyR * 1.15;
      const tipY = side * bodyR * 1.4 + phase;
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(midX, midY, tipX, tipY);
      ctx.stroke();
    }
    ctx.strokeStyle = '#6b4e35';
    ctx.lineWidth = 2;
  }

  private _drawBody(
    ctx: CanvasRenderingContext2D,
    bodyR: number,
    time: number,
  ): void {
    const grad = ctx.createRadialGradient(-bodyR / 3, -bodyR / 3, bodyR / 5, 0, 0, bodyR);
    grad.addColorStop(0, '#7a5a35');
    grad.addColorStop(1, '#3a2818');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyR, bodyR * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#2a1a0e';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#c9a84c';
    ctx.beginPath();
    ctx.arc(0, -bodyR * 0.1, bodyR * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6b5418';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + time * 0.005;
      ctx.beginPath();
      ctx.moveTo(
        Math.cos(a) * bodyR * 0.05,
        -bodyR * 0.1 + Math.sin(a) * bodyR * 0.05);
      ctx.lineTo(
        Math.cos(a) * bodyR * 0.18,
        -bodyR * 0.1 + Math.sin(a) * bodyR * 0.18);
      ctx.stroke();
    }

    ctx.fillStyle = '#1a0f08';
    ctx.fillRect(-bodyR * 0.9, -bodyR * 0.15, bodyR * 1.8, bodyR * 0.08);
    ctx.fillStyle = '#ff6b35';
    for (let i = 0; i < 4; i++) {
      const flicker = 0.6 + 0.4 * Math.sin(time * 0.01 + i);
      ctx.globalAlpha = flicker;
      ctx.beginPath();
      ctx.arc(-bodyR * 0.6 + i * bodyR * 0.4, -bodyR * 0.11, bodyR * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private _drawEyes(
    ctx: CanvasRenderingContext2D,
    bodyR: number,
  ): void {
    const eyeOffsetX = bodyR * 0.35;
    const eyeY = -bodyR * 0.3;
    const eyeR = bodyR * 0.12;

    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(-eyeOffsetX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(-eyeOffsetX, eyeY, eyeR * 0.5, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX, eyeY, eyeR * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(-eyeOffsetX + eyeR * 0.2, eyeY - eyeR * 0.2, eyeR * 0.25, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX + eyeR * 0.2, eyeY - eyeR * 0.2, eyeR * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
}
