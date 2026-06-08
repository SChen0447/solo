export type RuneType = 'lightning' | 'triangle' | 'circle' | null;
export type StoneColor = 'red' | 'blue' | 'green' | 'purple' | 'gold';

export interface Stone {
  id: number;
  color: StoneColor;
  row: number;
  col: number;
  targetRow: number;
  offsetY: number;
  offsetX: number;
  swingPhase: number;
  isFalling: boolean;
  isNew: boolean;
  bounceProgress: number;
  highlightTime: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: StoneColor;
  life: number;
  maxLife: number;
  targetX: number;
  targetY: number;
}

export interface Spirit {
  id: number;
  color: StoneColor;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  floatPhase: number;
  rotation: number;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  progress: number;
  life: number;
}

export interface GameState {
  grid: (Stone | null)[][];
  score: number;
  scoreDisplay: number;
  drawsLeft: number;
  isGameOver: boolean;
  particles: Particle[];
  spirits: Spirit[];
  shockwaves: Shockwave[];
  elementSlots: Record<StoneColor, number>;
  isAnimating: boolean;
  lastRune: RuneType;
  runeMatchTime: number;
}

export interface RunePoint {
  x: number;
  y: number;
  speed: number;
}

const STONE_COLORS: StoneColor[] = ['red', 'blue', 'green', 'purple', 'gold'];
const GRID_SIZE = 6;
const INITIAL_DRAWS = 5;
const SPIRIT_THRESHOLD = 3;

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

let idCounter = 0;
function nextId(): number {
  return ++idCounter;
}

function randomColor(): StoneColor {
  return STONE_COLORS[Math.floor(Math.random() * STONE_COLORS.length)];
}

function createStone(row: number, col: number, isNew: boolean = false): Stone {
  return {
    id: nextId(),
    color: randomColor(),
    row,
    col,
    targetRow: row,
    offsetY: isNew ? -1 : 0,
    offsetX: 0,
    swingPhase: Math.random() * Math.PI * 2,
    isFalling: isNew,
    isNew,
    bounceProgress: 0,
    highlightTime: 0,
  };
}

export class GameEngine {
  state: GameState;
  gridWidth: number = 0;
  gridHeight: number = 0;
  gridX: number = 0;
  gridY: number = 0;
  cellSize: number = 0;
  private listeners: Set<() => void> = new Set();
  private runePoints: RunePoint[] = [];
  private isDrawing: boolean = false;
  private lastPointTime: number = 0;
  private pulseTime: number = 0;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const grid: (Stone | null)[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      grid[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        grid[r][c] = createStone(r, c);
      }
    }
    return {
      grid,
      score: 0,
      scoreDisplay: 0,
      drawsLeft: INITIAL_DRAWS,
      isGameOver: false,
      particles: [],
      spirits: [],
      shockwaves: [],
      elementSlots: { red: 0, blue: 0, green: 0, purple: 0, gold: 0 },
      isAnimating: false,
      lastRune: null,
      runeMatchTime: 0,
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  setGridArea(x: number, y: number, width: number, height: number): void {
    this.gridX = x;
    this.gridY = y;
    this.gridWidth = width;
    this.gridHeight = height;
    this.cellSize = Math.min(width, height) / GRID_SIZE;
  }

  getCellPosition(row: number, col: number): { x: number; y: number } {
    const startX = this.gridX + (this.gridWidth - this.cellSize * GRID_SIZE) / 2;
    const startY = this.gridY + (this.gridHeight - this.cellSize * GRID_SIZE) / 2;
    return {
      x: startX + col * this.cellSize + this.cellSize / 2,
      y: startY + row * this.cellSize + this.cellSize / 2,
    };
  }

  getStonePosition(stone: Stone): { x: number; y: number } {
    const base = this.getCellPosition(stone.row, stone.col);
    const fallOffset = stone.offsetY * this.cellSize * GRID_SIZE;
    const swingOffset = stone.isFalling ? Math.sin(stone.swingPhase) * this.cellSize * 0.1 : 0;
    let bounceOffset = 0;
    if (stone.bounceProgress > 0 && stone.bounceProgress < 1) {
      const t = stone.bounceProgress;
      bounceOffset = -Math.sin(t * Math.PI) * this.cellSize * 0.15;
    }
    return {
      x: base.x + swingOffset + stone.offsetX * this.cellSize,
      y: base.y + fallOffset + bounceOffset,
    };
  }

  startDrawing(x: number, y: number): void {
    if (this.state.isGameOver || this.state.isAnimating) return;
    this.isDrawing = true;
    this.runePoints = [{ x, y, speed: 0 }];
    this.lastPointTime = performance.now();
    this.notify();
  }

  continueDrawing(x: number, y: number): void {
    if (!this.isDrawing) return;
    const now = performance.now();
    const dt = (now - this.lastPointTime) / 1000;
    this.lastPointTime = now;

    const last = this.runePoints[this.runePoints.length - 1];
    const dx = x - last.x;
    const dy = y - last.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = dt > 0 ? dist / dt : 0;

    if (dist > 3 && this.runePoints.length < 50) {
      this.runePoints.push({ x, y, speed });
      this.notify();
    }
  }

  endDrawing(): RuneType {
    if (!this.isDrawing) return null;
    this.isDrawing = false;

    const rune = this.recognizeRune();
    this.state.lastRune = rune;
    this.state.runeMatchTime = performance.now();

    if (rune) {
      this.onRuneSuccess(rune);
    } else {
      this.onRuneFail();
    }

    this.runePoints = [];
    this.notify();
    return rune;
  }

  getRunePoints(): RunePoint[] {
    return this.runePoints;
  }

  isDrawingActive(): boolean {
    return this.isDrawing;
  }

  private recognizeRune(): RuneType {
    if (this.runePoints.length < 8) return null;

    const points = this.runePoints;
    const start = points[0];
    const end = points[points.length - 1];

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    const width = maxX - minX;
    const height = maxY - minY;
    const diag = Math.sqrt(width * width + height * height);
    if (diag < 40) return null;

    if (this.isCircle(points, width, height)) {
      return 'circle';
    }

    if (this.isLightning(points, width, height)) {
      return 'lightning';
    }

    if (this.isTriangle(points, width, height)) {
      return 'triangle';
    }

    return null;
  }

  private isCircle(points: RunePoint[], w: number, h: number): boolean {
    if (w < 30 || h < 30) return false;
    const ratio = Math.min(w, h) / Math.max(w, h);
    if (ratio < 0.5) return false;

    const start = points[0];
    const end = points[points.length - 1];
    const closeDist = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    const avgDim = (w + h) / 2;
    if (closeDist > avgDim * 0.4) return false;

    const cx = (w) / 2 + points.reduce((m, p) => Math.min(m, p.x), Infinity);
    const cy = (h) / 2 + points.reduce((m, p) => Math.min(m, p.y), Infinity);
    const r = avgDim / 2;

    let totalDev = 0;
    for (const p of points) {
      const dist = Math.sqrt(Math.pow(p.x - cx, 2) + Math.pow(p.y - cy, 2));
      totalDev += Math.abs(dist - r);
    }
    const avgDev = totalDev / points.length;
    return avgDev < r * 0.35;
  }

  private isLightning(points: RunePoint[], w: number, h: number): boolean {
    if (h < w * 0.8) return false;

    const yValues = points.map((p) => p.y);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);

    const startTop = points[0].y < points[points.length - 1].y;
    const topY = startTop ? points[0].y : points[points.length - 1].y;
    const botY = startTop ? points[points.length - 1].y : points[0].y;

    if (Math.abs(topY - minY) > h * 0.2) return false;
    if (Math.abs(botY - maxY) > h * 0.2) return false;

    let directionChanges = 0;
    let lastDx = 0;
    for (let i = 2; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      if (Math.abs(dx) > 2) {
        if (lastDx !== 0 && dx * lastDx < 0) {
          directionChanges++;
        }
        lastDx = dx;
      }
    }

    return directionChanges >= 1 && directionChanges <= 4;
  }

  private isTriangle(points: RunePoint[], w: number, h: number): boolean {
    if (w < 30 || h < 30) return false;

    const corners = this.findCorners(points);
    if (corners.length < 3 || corners.length > 5) return false;

    const start = points[0];
    const end = points[points.length - 1];
    const closeDist = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );
    const avgDim = (w + h) / 2;
    return closeDist < avgDim * 0.5;
  }

  private findCorners(points: RunePoint[]): RunePoint[] {
    const corners: RunePoint[] = [];
    const window = 4;

    for (let i = window; i < points.length - window; i++) {
      const p1 = points[i - window];
      const p2 = points[i];
      const p3 = points[i + window];

      const ang1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const ang2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
      let angleDiff = Math.abs(ang2 - ang1);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

      if (angleDiff > Math.PI / 4) {
        const lastCorner = corners[corners.length - 1];
        if (!lastCorner ||
            Math.sqrt(Math.pow(p2.x - lastCorner.x, 2) + Math.pow(p2.y - lastCorner.y, 2)) > 20) {
          corners.push(p2);
        }
      }
    }
    return corners;
  }

  private onRuneSuccess(rune: RuneType): void {
    if (!rune || this.runePoints.length === 0) return;

    const startPoint = this.runePoints[0];
    const maxRadius = this.cellSize * 2.5;

    this.state.shockwaves.push({
      x: startPoint.x,
      y: startPoint.y,
      radius: 0,
      maxRadius,
      progress: 0,
      life: 0.4,
    });

    this.state.isAnimating = true;

    setTimeout(() => {
      this.eliminateStonesInRadius(startPoint.x, startPoint.y, maxRadius);
    }, 200);
  }

  private onRuneFail(): void {
    this.state.drawsLeft--;
    if (this.state.drawsLeft <= 0) {
      this.state.isGameOver = true;
    }
  }

  private eliminateStonesInRadius(cx: number, cy: number, radius: number): void {
    const toRemove: { row: number; col: number; stone: Stone }[] = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const stone = this.state.grid[r][c];
        if (stone) {
          const pos = this.getStonePosition(stone);
          const dist = Math.sqrt(Math.pow(pos.x - cx, 2) + Math.pow(pos.y - cy, 2));
          if (dist < radius + this.cellSize * 0.3) {
            toRemove.push({ row: r, col: c, stone });
          }
        }
      }
    }

    if (toRemove.length === 0) {
      this.state.isAnimating = false;
      this.notify();
      return;
    }

    const slotTopY = this.gridY - this.cellSize * 0.5;
    const slotSpacing = this.gridWidth / 5;
    const slotStartX = this.gridX + slotSpacing / 2;

    const colorOrder: StoneColor[] = ['red', 'blue', 'green', 'purple', 'gold'];

    toRemove.forEach(({ stone, col }) => {
      this.state.grid[stone.row][col] = null;
      stone.highlightTime = 0.3;

      const slotIndex = colorOrder.indexOf(stone.color);
      const targetX = slotStartX + slotIndex * slotSpacing;
      const targetY = slotTopY;

      const basePos = this.getStonePosition(stone);

      for (let i = 0; i < 15; i++) {
        this.state.particles.push({
          id: nextId(),
          x: basePos.x + (Math.random() - 0.5) * this.cellSize * 0.5,
          y: basePos.y + (Math.random() - 0.5) * this.cellSize * 0.5,
          vx: (Math.random() - 0.5) * 100,
          vy: -100 - Math.random() * 150,
          color: stone.color,
          life: 0,
          maxLife: 0.6,
          targetX: targetX + (Math.random() - 0.5) * 20,
          targetY: targetY + (Math.random() - 0.5) * 20,
        });
      }

      this.state.elementSlots[stone.color]++;
      this.state.score += 10;
    });

    colorOrder.forEach((color) => {
      while (this.state.elementSlots[color] >= SPIRIT_THRESHOLD) {
        this.state.elementSlots[color] -= SPIRIT_THRESHOLD;
        this.spawnSpirit(color);
        this.state.score += 100;
      }
    });

    setTimeout(() => {
      this.dropStones();
    }, 400);

    this.notify();
  }

  private spawnSpirit(color: StoneColor): void {
    const colorOrder: StoneColor[] = ['red', 'blue', 'green', 'purple', 'gold'];
    const slotIndex = colorOrder.indexOf(color);
    const slotSpacing = this.gridWidth / 5;
    const slotStartX = this.gridX + slotSpacing / 2;

    this.state.spirits.push({
      id: nextId(),
      color,
      x: slotStartX + slotIndex * slotSpacing,
      y: this.gridY - this.cellSize * 0.5,
      life: 0,
      maxLife: 3,
      floatPhase: Math.random() * Math.PI * 2,
      rotation: 0,
    });
  }

  private dropStones(): void {
    for (let c = 0; c < GRID_SIZE; c++) {
      let writeRow = GRID_SIZE - 1;
      for (let r = GRID_SIZE - 1; r >= 0; r--) {
        const stone = this.state.grid[r][c];
        if (stone) {
          if (writeRow !== r) {
            stone.targetRow = writeRow;
            stone.offsetY = (r - writeRow);
            stone.isFalling = true;
            stone.swingPhase = Math.random() * Math.PI * 2;
            this.state.grid[writeRow][c] = stone;
            this.state.grid[r][c] = null;
          }
          writeRow--;
        }
      }

      for (let r = writeRow; r >= 0; r--) {
        const newStone = createStone(r, c, true);
        newStone.offsetY = -(writeRow - r + 1);
        newStone.isFalling = true;
        newStone.swingPhase = Math.random() * Math.PI * 2;
        this.state.grid[r][c] = newStone;
      }
    }

    this.notify();
  }

  update(dt: number): void {
    this.pulseTime += dt;

    const scoreDiff = this.state.score - this.state.scoreDisplay;
    if (Math.abs(scoreDiff) > 0.5) {
      this.state.scoreDisplay += scoreDiff * Math.min(1, dt * 8);
    } else {
      this.state.scoreDisplay = this.state.score;
    }

    for (let i = this.state.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.state.shockwaves[i];
      sw.life -= dt;
      sw.progress = 1 - sw.life / 0.4;
      sw.radius = sw.maxRadius * easeOutQuad(Math.min(1, sw.progress));
      if (sw.life <= 0) {
        this.state.shockwaves.splice(i, 1);
      }
    }

    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.life += dt;
      const t = p.life / p.maxLife;

      if (t < 0.3) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 200 * dt;
      } else {
        const t2 = (t - 0.3) / 0.7;
        const eased = easeInOutQuad(t2);
        p.x = p.x + (p.targetX - p.x) * eased * 0.1;
        p.y = p.y + (p.targetY - p.y) * eased * 0.1;
      }

      if (p.life >= p.maxLife) {
        this.state.particles.splice(i, 1);
      }
    }

    for (let i = this.state.spirits.length - 1; i >= 0; i--) {
      const s = this.state.spirits[i];
      s.life += dt;
      s.floatPhase += dt * 3;
      s.rotation += dt * 2;
      if (s.life >= s.maxLife) {
        this.state.spirits.splice(i, 1);
      }
    }

    let anyFalling = false;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const stone = this.state.grid[r][c];
        if (stone && stone.isFalling) {
          anyFalling = true;
          stone.offsetY += dt * 5;
          stone.swingPhase += dt * 8;
          stone.offsetX = Math.sin(stone.swingPhase) * 0.1;

          if (stone.offsetY >= 0) {
            stone.offsetY = 0;
            stone.offsetX = 0;
            stone.isFalling = false;
            stone.isNew = false;
            stone.bounceProgress = 0;
            stone.row = stone.targetRow;
          }
        }

        if (stone && stone.highlightTime > 0) {
          stone.highlightTime -= dt;
        }

        if (stone && stone.bounceProgress > 0 && stone.bounceProgress < 1) {
          stone.bounceProgress += dt * 5;
        }
      }
    }

    if (this.state.isAnimating && !anyFalling && this.state.particles.length === 0) {
      this.state.isAnimating = false;
    }

    this.notify();
  }

  getPulseTime(): number {
    return this.pulseTime;
  }

  restart(): void {
    idCounter = 0;
    this.state = this.createInitialState();
    this.runePoints = [];
    this.isDrawing = false;
    this.notify();
  }
}
