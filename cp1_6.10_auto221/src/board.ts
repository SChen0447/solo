export interface Star {
  x: number;
  y: number;
  radius: number;
  phase: number;
}

export interface CellPos {
  row: number;
  col: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  scale: number;
}

const GRID_SIZE = 5;
const CELL_SIZE = 80;
const GRID_LINE_WIDTH = 2;
const GRID_COLOR = '#4fc3f7';
const AUTO_ROTATION_SPEED = 0.3;
const ROTATION_ANIM_DURATION = 1;
const ROTATION_ANIM_ANGLE = Math.PI / 6;

export class Board {
  private width: number;
  private height: number;
  private rotationY: number = 0;
  private targetRotationDelta: number = 0;
  private rotationAnimTime: number = 0;
  private stars: Star[] = [];
  private time: number = 0;
  private fadeInAlpha: number = 0;
  private fadeInTime: number = 0;
  private fadeInDuration: number = 1;
  private isFadingIn: boolean = false;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.initStars();
    this.startFadeIn();
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < 150; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 1 + Math.random(),
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  startFadeIn(): void {
    this.isFadingIn = true;
    this.fadeInTime = 0;
    this.fadeInAlpha = 0;
  }

  triggerRotation(): void {
    this.targetRotationDelta = ROTATION_ANIM_ANGLE;
    this.rotationAnimTime = ROTATION_ANIM_DURATION;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.initStars();
  }

  getGridSize(): number {
    return GRID_SIZE;
  }

  getCellSize(): number {
    return CELL_SIZE;
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private readonly tiltX: number = Math.PI / 5;

  project(pos: Vec3, extraRotationY: number = 0): ProjectedPoint {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const angle = this.rotationY + extraRotationY;
    const cosY = Math.cos(angle);
    const sinY = Math.sin(angle);
    let rx = pos.x * cosY - pos.z * sinY;
    let rz = pos.x * sinY + pos.z * cosY;
    let ry = pos.y;
    const cosX = Math.cos(this.tiltX);
    const sinX = Math.sin(this.tiltX);
    const newY = ry * cosX - rz * sinX;
    const newZ = ry * sinX + rz * cosX;
    ry = newY;
    rz = newZ;
    const camDist = 800;
    const scale = camDist / (camDist + rz + 400);
    return {
      x: cx + rx * scale,
      y: cy + ry * scale,
      scale
    };
  }

  getCellWorldPos(row: number, col: number, y: number = 0): Vec3 {
    const half = (GRID_SIZE - 1) / 2;
    return {
      x: (col - half) * CELL_SIZE,
      y,
      z: (row - half) * CELL_SIZE
    };
  }

  getCellCenterScreen(row: number, col: number): ProjectedPoint {
    return this.project(this.getCellWorldPos(row, col));
  }

  screenToCell(sx: number, sy: number): CellPos | null {
    let bestRow = -1;
    let bestCol = -1;
    let bestDist = Infinity;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const p = this.getCellCenterScreen(r, c);
        const dx = sx - p.x;
        const dy = sy - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const threshold = CELL_SIZE * 0.5 * p.scale;
        if (dist < threshold && dist < bestDist) {
          bestDist = dist;
          bestRow = r;
          bestCol = c;
        }
      }
    }
    if (bestRow < 0) return null;
    return { row: bestRow, col: bestCol };
  }

  update(dt: number): void {
    this.time += dt;
    if (this.rotationAnimTime > 0) {
      const prevT = 1 - this.rotationAnimTime / ROTATION_ANIM_DURATION;
      this.rotationAnimTime -= dt;
      if (this.rotationAnimTime < 0) this.rotationAnimTime = 0;
      const t = 1 - this.rotationAnimTime / ROTATION_ANIM_DURATION;
      const delta = this.easeOut(t) - this.easeOut(prevT);
      this.rotationY += delta * this.targetRotationDelta;
    } else {
      this.rotationY += AUTO_ROTATION_SPEED * dt;
    }
    if (this.isFadingIn) {
      this.fadeInTime += dt;
      if (this.fadeInTime >= this.fadeInDuration) {
        this.isFadingIn = false;
        this.fadeInAlpha = 1;
      } else {
        this.fadeInAlpha = this.fadeInTime / this.fadeInDuration;
      }
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7
    );
    grad.addColorStop(0, '#14142e');
    grad.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
    for (const star of this.stars) {
      const alpha = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(this.time * 2 + star.phase));
      ctx.save();
      ctx.globalAlpha = alpha * this.fadeInAlpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    const half = (GRID_SIZE - 1) / 2;
    ctx.save();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = GRID_LINE_WIDTH;
    ctx.shadowColor = GRID_COLOR;
    ctx.shadowBlur = 15;
    ctx.globalAlpha = this.fadeInAlpha;

    const y = 0;
    for (let i = 0; i < GRID_SIZE; i++) {
      const coord = (i - half) * CELL_SIZE;
      const start = this.project({ x: -half * CELL_SIZE, y, z: coord });
      const end = this.project({ x: half * CELL_SIZE, y, z: coord });
      ctx.lineWidth = GRID_LINE_WIDTH * (start.scale + end.scale) / 2;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      const start2 = this.project({ x: coord, y, z: -half * CELL_SIZE });
      const end2 = this.project({ x: coord, y, z: half * CELL_SIZE });
      ctx.lineWidth = GRID_LINE_WIDTH * (start2.scale + end2.scale) / 2;
      ctx.beginPath();
      ctx.moveTo(start2.x, start2.y);
      ctx.lineTo(end2.x, end2.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx);
    this.drawGrid(ctx);
  }

  getFadeAlpha(): number {
    return this.fadeInAlpha;
  }
}
