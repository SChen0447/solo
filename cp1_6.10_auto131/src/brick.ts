export interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  row: number;
  col: number;
  alive: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  vertices: { x: number; y: number }[];
}

export interface BrickGrid {
  bricks: Brick[];
  rows: number;
  cols: number;
  particles: Particle[];
  gridMap: (Brick | null)[][];
}

const BRICK_WIDTH = 80;
const BRICK_HEIGHT = 30;
const ROW_SPACING = 5;
const COL_SPACING = 10;
const BRICK_RADIUS = 4;
const GRID_OFFSET_TOP = 60;
const GRID_OFFSET_LEFT = 35;
const PULSE_PERIOD = 0.5;
const PULSE_DURATION = 0.3;

const ROW_COLORS = [
  '#ff6b6b', '#ff8787', '#ffa94d', '#ffd43b',
  '#69db7c', '#4dabf7', '#9775fa', '#48dbfb'
];

function getRowColor(row: number, totalRows: number): string {
  const t = totalRows <= 1 ? 0 : row / (totalRows - 1);
  const colorIndex = Math.floor(t * (ROW_COLORS.length - 1));
  const nextIndex = Math.min(colorIndex + 1, ROW_COLORS.length - 1);
  const localT = (t * (ROW_COLORS.length - 1)) - colorIndex;
  return interpolateColor(ROW_COLORS[colorIndex], ROW_COLORS[nextIndex], localT);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function interpolateColor(c1: string, c2: string, t: number): string {
  const rgb1 = hexToRgb(c1);
  const rgb2 = hexToRgb(c2);
  return rgbToHex(
    rgb1.r + (rgb2.r - rgb1.r) * t,
    rgb1.g + (rgb2.g - rgb1.g) * t,
    rgb1.b + (rgb2.b - rgb1.b) * t
  );
}

export function createBricks(rows: number, cols: number = 10): BrickGrid {
  const bricks: Brick[] = [];
  const gridMap: (Brick | null)[][] = [];

  for (let r = 0; r < rows; r++) {
    gridMap[r] = [];
    for (let c = 0; c < cols; c++) {
      const x = GRID_OFFSET_LEFT + c * (BRICK_WIDTH + COL_SPACING);
      const y = GRID_OFFSET_TOP + r * (BRICK_HEIGHT + ROW_SPACING);
      const brick: Brick = {
        x,
        y,
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT,
        color: getRowColor(r, rows),
        row: r,
        col: c,
        alive: true
      };
      bricks.push(brick);
      gridMap[r][c] = brick;
    }
  }

  return { bricks, rows, cols, particles: [], gridMap };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function generatePolygonVertices(size: number): { x: number; y: number }[] {
  const sides = 5 + Math.floor(Math.random() * 3);
  const verts: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    const r = size * (0.7 + Math.random() * 0.3);
    verts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
  }
  return verts;
}

function createExplosionParticles(brick: Brick): Particle[] {
  const particles: Particle[] = [];
  const count = 6;
  const cx = brick.x + brick.width / 2;
  const cy = brick.y + brick.height / 2;

  for (let i = 0; i < count; i++) {
    const angleDeg = 45 + Math.random() * 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    const speed = 2 + Math.random() * 2;
    const dir = Math.random() < 0.5 ? -1 : 1;
    const actualAngle = angleRad * dir + (Math.random() - 0.5) * 0.5;
    const size = 4 + Math.random() * 2;

    particles.push({
      x: cx + (Math.random() - 0.5) * brick.width * 0.5,
      y: cy + (Math.random() - 0.5) * brick.height * 0.5,
      vx: Math.cos(actualAngle) * speed,
      vy: Math.sin(actualAngle) * speed,
      size,
      color: brick.color,
      life: 0.8,
      maxLife: 0.8,
      vertices: generatePolygonVertices(size)
    });
  }
  return particles;
}

export function hitBrick(grid: BrickGrid, brick: Brick): void {
  if (!brick.alive) return;
  brick.alive = false;
  grid.gridMap[brick.row][brick.col] = null;
  const newParticles = createExplosionParticles(brick);
  grid.particles.push(...newParticles);
}

export function updateBricks(grid: BrickGrid, deltaTime: number): void {
  for (let i = grid.particles.length - 1; i >= 0; i--) {
    const p = grid.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life -= deltaTime;
    if (p.life <= 0) {
      grid.particles.splice(i, 1);
    }
  }
}

export function getPulseAlpha(elapsedTime: number): number {
  const phase = elapsedTime % PULSE_PERIOD;
  if (phase < PULSE_DURATION) {
    const t = phase / PULSE_DURATION;
    return 0.1 + Math.sin(t * Math.PI) * 0.1;
  }
  return 0;
}

export function renderBricks(ctx: CanvasRenderingContext2D, grid: BrickGrid, elapsedTime: number): void {
  const pulseAlpha = getPulseAlpha(elapsedTime);

  for (const brick of grid.bricks) {
    if (!brick.alive) continue;

    ctx.save();
    roundRect(ctx, brick.x, brick.y, brick.width, brick.height, BRICK_RADIUS);
    ctx.fillStyle = brick.color;
    ctx.fill();

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();

    if (pulseAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = pulseAlpha;
      roundRect(ctx, brick.x - 3, brick.y - 3, brick.width + 6, brick.height + 6, BRICK_RADIUS + 2);
      ctx.fillStyle = brick.color;
      ctx.shadowColor = brick.color;
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.restore();
    }
  }

  for (const p of grid.particles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.translate(p.x, p.y);
    ctx.beginPath();
    const verts = p.vertices;
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) {
      ctx.lineTo(verts[i].x, verts[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export function getBricksInArea(grid: BrickGrid, x: number, y: number, radius: number): Brick[] {
  const result: Brick[] = [];
  const checkLeft = Math.max(0, x - radius);
  const checkRight = x + radius;
  const checkTop = Math.max(0, y - radius);
  const checkBottom = y + radius;

  for (const brick of grid.bricks) {
    if (!brick.alive) continue;
    if (brick.x + brick.width < checkLeft || brick.x > checkRight) continue;
    if (brick.y + brick.height < checkTop || brick.y > checkBottom) continue;
    result.push(brick);
    if (result.length >= 100) break;
  }
  return result;
}

export function getRemainingBricks(grid: BrickGrid): number {
  let count = 0;
  for (const brick of grid.bricks) {
    if (brick.alive) count++;
  }
  return count;
}
