import { FireSystem, FireType } from './fire.js';

export type RuneShape = 'circle' | 'sShape' | 'zShape' | 'triangle' | 'spiral' | 'infinity';

export interface Rune {
  shape: RuneShape;
  fireType: FireType;
  isResonation: boolean;
  difficulty: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface GameStats {
  fireTypesUnlocked: Set<FireType>;
  maxBurnDuration: number;
  totalResonations: number;
  successfulMatches: number;
  failedMatches: number;
}

export interface ShockwaveEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  active: boolean;
}

export interface SuccessWaveEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  active: boolean;
  color: string;
}

export interface AltarState {
  isGrayed: boolean;
  grayTimer: number;
  isShaking: boolean;
  shakeTimer: number;
  shakeIntensity: number;
  shakeOffsetX: number;
  shakeOffsetY: number;
}

const SHAPE_NAMES: Record<RuneShape, string> = {
  circle: '圆',
  sShape: 'S形',
  zShape: 'Z形',
  triangle: '三角',
  spiral: '螺旋',
  infinity: '∞'
};

const FIRE_NAMES: Record<FireType, string> = {
  lava: '熔岩火',
  ice: '冰焰',
  poison: '毒火'
};

const BASIC_SHAPES: RuneShape[] = ['circle', 'sShape', 'zShape', 'triangle'];
const ADVANCED_SHAPES: RuneShape[] = ['spiral', 'infinity', 'circle', 'sShape'];

export class Game {
  private fireSystem: FireSystem;
  private currentRune: Rune | null = null;
  private currentTrail: TrailPoint[] = [];
  private isDrawing: boolean = false;
  private stats: GameStats;
  private shockwave: ShockwaveEffect;
  private successWave: SuccessWaveEffect;
  private altarState: AltarState;
  private resonationAvailable: boolean = false;
  private resonationTimer: number = 0;
  private lastBurnCheck: number = 0;
  private altarX: number;
  private altarY: number;

  constructor(fireSystem: FireSystem, altarX: number, altarY: number) {
    this.fireSystem = fireSystem;
    this.altarX = altarX;
    this.altarY = altarY;
    this.stats = {
      fireTypesUnlocked: new Set<FireType>(),
      maxBurnDuration: 0,
      totalResonations: 0,
      successfulMatches: 0,
      failedMatches: 0
    };
    this.shockwave = { x: 0, y: 0, radius: 0, maxRadius: 250, alpha: 0, active: false };
    this.successWave = { x: 0, y: 0, radius: 0, maxRadius: 300, alpha: 0, active: false, color: '#d4a853' };
    this.altarState = {
      isGrayed: false,
      grayTimer: 0,
      isShaking: false,
      shakeTimer: 0,
      shakeIntensity: 0,
      shakeOffsetX: 0,
      shakeOffsetY: 0
    };
    this.generateNewRune(false);
  }

  public setAltarPosition(x: number, y: number): void {
    this.altarX = x;
    this.altarY = y;
  }

  public getCurrentRune(): Rune | null {
    return this.currentRune;
  }

  public getStats(): GameStats {
    return this.stats;
  }

  public getFireSystem(): FireSystem {
    return this.fireSystem;
  }

  public getShockwave(): ShockwaveEffect {
    return this.shockwave;
  }

  public getSuccessWave(): SuccessWaveEffect {
    return this.successWave;
  }

  public getAltarState(): AltarState {
    return this.altarState;
  }

  public isDrawingTrail(): boolean {
    return this.isDrawing;
  }

  public getTrail(): TrailPoint[] {
    return this.currentTrail;
  }

  public hasResonationAvailable(): boolean {
    return this.resonationAvailable;
  }

  public getShapeName(shape: RuneShape): string {
    return SHAPE_NAMES[shape];
  }

  public getFireName(fireType: FireType): string {
    return FIRE_NAMES[fireType];
  }

  public startDrawing(x: number, y: number): void {
    this.isDrawing = true;
    this.currentTrail = [{ x, y, timestamp: performance.now() }];
  }

  public continueDrawing(x: number, y: number): void {
    if (!this.isDrawing) return;
    const lastPoint = this.currentTrail[this.currentTrail.length - 1];
    const dist = Math.hypot(x - lastPoint.x, y - lastPoint.y);
    if (dist > 3) {
      this.currentTrail.push({ x, y, timestamp: performance.now() });
    }
  }

  public endDrawing(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.currentTrail.length >= 10 && this.currentRune) {
      this.evaluateGesture();
    }
    this.currentTrail = [];
  }

  public update(deltaTime: number): void {
    this.updateAltarState(deltaTime);
    this.updateEffects(deltaTime);
    this.checkResonationAvailability();
    this.updateBurnStats();
  }

  private updateAltarState(deltaTime: number): void {
    if (this.altarState.isGrayed) {
      this.altarState.grayTimer -= deltaTime;
      if (this.altarState.grayTimer <= 0) {
        this.altarState.isGrayed = false;
      }
    }
    if (this.altarState.isShaking) {
      this.altarState.shakeTimer -= deltaTime;
      if (this.altarState.shakeTimer <= 0) {
        this.altarState.isShaking = false;
        this.altarState.shakeOffsetX = 0;
        this.altarState.shakeOffsetY = 0;
      } else {
        const intensity = this.altarState.shakeIntensity * (this.altarState.shakeTimer / 0.3);
        this.altarState.shakeOffsetX = (Math.random() - 0.5) * intensity;
        this.altarState.shakeOffsetY = (Math.random() - 0.5) * intensity;
      }
    }
  }

  private updateEffects(deltaTime: number): void {
    if (this.shockwave.active) {
      this.shockwave.radius += 400 * deltaTime;
      this.shockwave.alpha = Math.max(0, 1 - this.shockwave.radius / this.shockwave.maxRadius);
      if (this.shockwave.radius >= this.shockwave.maxRadius) {
        this.shockwave.active = false;
      }
    }
    if (this.successWave.active) {
      this.successWave.radius += 350 * deltaTime;
      this.successWave.alpha = Math.max(0, 1 - this.successWave.radius / this.successWave.maxRadius);
      if (this.successWave.radius >= this.successWave.maxRadius) {
        this.successWave.active = false;
      }
    }
  }

  private checkResonationAvailability(): void {
    const burnDuration = this.fireSystem.getBurnDuration();
    const fireState = this.fireSystem.getState();

    if (fireState.isBurning && burnDuration >= 10 && !fireState.isUpgraded && !this.resonationAvailable) {
      this.resonationAvailable = true;
      this.generateNewRune(true);
    }

    if (!fireState.isBurning || fireState.isUpgraded) {
      this.resonationAvailable = false;
    }
  }

  private updateBurnStats(): void {
    const burnDuration = this.fireSystem.getBurnDuration();
    const now = performance.now();

    if (burnDuration > 0 && now - this.lastBurnCheck > 500) {
      if (burnDuration > this.stats.maxBurnDuration) {
        this.stats.maxBurnDuration = burnDuration;
      }
      this.lastBurnCheck = now;
    }
  }

  private generateNewRune(isResonation: boolean): void {
    const shapes = isResonation ? ADVANCED_SHAPES : BASIC_SHAPES;
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const fireTypes: FireType[] = ['lava', 'ice', 'poison'];
    const fireType = fireTypes[Math.floor(Math.random() * fireTypes.length)];

    this.currentRune = {
      shape,
      fireType,
      isResonation,
      difficulty: isResonation ? 2 : 1
    };
  }

  private evaluateGesture(): void {
    if (!this.currentRune) return;

    const normalizedPoints = this.normalizeTrail(this.currentTrail);
    const matchScore = this.matchShape(normalizedPoints, this.currentRune.shape);
    const threshold = this.currentRune.isResonation ? 0.65 : 0.5;

    if (matchScore >= threshold) {
      this.onMatchSuccess();
    } else {
      this.onMatchFailure();
    }
  }

  private onMatchSuccess(): void {
    if (!this.currentRune) return;

    const fireState = this.fireSystem.getState();

    if (this.currentRune.isResonation && fireState.isBurning) {
      this.fireSystem.upgrade();
      this.stats.totalResonations++;
      this.resonationAvailable = false;
    } else {
      this.fireSystem.ignite(this.currentRune.fireType);
    }

    this.stats.fireTypesUnlocked.add(this.currentRune.fireType);
    this.stats.successfulMatches++;

    const colors = this.fireSystem.getColors();
    this.successWave = {
      x: this.altarX,
      y: this.altarY,
      radius: 10,
      maxRadius: 300,
      alpha: 1,
      active: true,
      color: colors ? colors.inner : '#d4a853'
    };

    setTimeout(() => {
      if (!this.resonationAvailable) {
        this.generateNewRune(false);
      }
    }, 800);
  }

  private onMatchFailure(): void {
    this.stats.failedMatches++;
    this.fireSystem.applyShockwave(this.altarX, this.altarY);

    this.shockwave = {
      x: this.altarX,
      y: this.altarY,
      radius: 10,
      maxRadius: 250,
      alpha: 1,
      active: false
    };
    this.shockwave.active = true;

    this.altarState.isGrayed = true;
    this.altarState.grayTimer = 1.5;
    this.altarState.isShaking = true;
    this.altarState.shakeTimer = 0.3;
    this.altarState.shakeIntensity = 8;
  }

  private normalizeTrail(trail: TrailPoint[]): { x: number; y: number }[] {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const p of trail) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    const width = maxX - minX;
    const height = maxY - minY;
    const size = Math.max(width, height, 1);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const normalized: { x: number; y: number }[] = [];
    for (const p of trail) {
      normalized.push({
        x: (p.x - centerX) / size * 2,
        y: (p.y - centerY) / size * 2
      });
    }

    return this.resample(normalized, 64);
  }

  private resample(points: { x: number; y: number }[], targetCount: number): { x: number; y: number }[] {
    if (points.length < 2) return points;

    const totalLength = this.getPathLength(points);
    const interval = totalLength / (targetCount - 1);
    const result: { x: number; y: number }[] = [points[0]];
    let accumulated = 0;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const segLen = Math.hypot(curr.x - prev.x, curr.y - prev.y);

      if (accumulated + segLen >= interval && result.length < targetCount) {
        const t = (interval - accumulated) / segLen;
        const newPoint = {
          x: prev.x + t * (curr.x - prev.x),
          y: prev.y + t * (curr.y - prev.y)
        };
        result.push(newPoint);
        points.splice(i, 0, newPoint);
        accumulated = 0;
      } else {
        accumulated += segLen;
      }
    }

    while (result.length < targetCount) {
      result.push({ ...points[points.length - 1] });
    }

    return result.slice(0, targetCount);
  }

  private getPathLength(points: { x: number; y: number }[]): number {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    return length;
  }

  private matchShape(points: { x: number; y: number }[], shape: RuneShape): number {
    switch (shape) {
      case 'circle':
        return this.matchCircle(points);
      case 'sShape':
        return this.matchSShape(points);
      case 'zShape':
        return this.matchZShape(points);
      case 'triangle':
        return this.matchTriangle(points);
      case 'spiral':
        return this.matchSpiral(points);
      case 'infinity':
        return this.matchInfinity(points);
      default:
        return 0;
    }
  }

  private matchCircle(points: { x: number; y: number }[]): number {
    if (points.length < 10) return 0;

    let score = 0;
    const first = points[0];
    const last = points[points.length - 1];
    const closureDist = Math.hypot(last.x - first.x, last.y - first.y);
    const closureScore = Math.max(0, 1 - closureDist * 2);

    let radiusSum = 0;
    const radii: number[] = [];
    for (const p of points) {
      const r = Math.hypot(p.x, p.y);
      radii.push(r);
      radiusSum += r;
    }
    const avgRadius = radiusSum / points.length;
    let radiusVariance = 0;
    for (const r of radii) {
      radiusVariance += (r - avgRadius) ** 2;
    }
    radiusVariance = Math.sqrt(radiusVariance / points.length);
    const uniformityScore = Math.max(0, 1 - radiusVariance * 3);

    const totalAngle = this.calculateTotalAngle(points);
    const angleScore = Math.min(1, totalAngle / (Math.PI * 2));

    score = closureScore * 0.3 + uniformityScore * 0.4 + angleScore * 0.3;
    return score;
  }

  private matchSShape(points: { x: number; y: number }[]): number {
    if (points.length < 10) return 0;

    const n = points.length;
    const firstThird = points.slice(0, Math.floor(n / 3));
    const lastThird = points.slice(Math.floor(n * 2 / 3));

    let firstDirection = 0;
    for (let i = 1; i < firstThird.length; i++) {
      firstDirection += firstThird[i].x - firstThird[i - 1].x;
    }

    let lastDirection = 0;
    for (let i = 1; i < lastThird.length; i++) {
      lastDirection += lastThird[i].x - lastThird[i - 1].x;
    }

    const directionChange = (firstDirection > 0 && lastDirection < 0) ||
                            (firstDirection < 0 && lastDirection > 0) ? 1 : 0;

    let yVariance = 0;
    const yValues = points.map(p => p.y);
    const avgY = yValues.reduce((a, b) => a + b, 0) / yValues.length;
    for (const y of yValues) {
      yVariance += (y - avgY) ** 2;
    }
    yVariance = Math.sqrt(yVariance / yValues.length);
    const ySpreadScore = Math.min(1, yVariance * 2);

    return directionChange * 0.6 + ySpreadScore * 0.4;
  }

  private matchZShape(points: { x: number; y: number }[]): number {
    if (points.length < 10) return 0;

    const n = points.length;
    const segments = 3;
    const segLen = Math.floor(n / segments);

    const angles: number[] = [];
    for (let s = 0; s < segments; s++) {
      const start = s * segLen;
      const end = Math.min(start + segLen, n) - 1;
      if (end > start) {
        const dx = points[end].x - points[start].x;
        const dy = points[end].y - points[start].y;
        angles.push(Math.atan2(dy, dx));
      }
    }

    if (angles.length < 3) return 0;

    let directionChanges = 0;
    for (let i = 1; i < angles.length; i++) {
      const diff = Math.abs(angles[i] - angles[i - 1]);
      if (diff > Math.PI / 4 && diff < Math.PI * 3 / 4) {
        directionChanges++;
      }
    }

    const directionScore = directionChanges >= 2 ? 1 : directionChanges / 2;

    const totalDist = Math.hypot(
      points[n - 1].x - points[0].x,
      points[n - 1].y - points[0].y
    );
    const pathLength = this.getPathLength(points);
    const efficiencyScore = Math.min(1, totalDist / (pathLength * 0.5));

    return directionScore * 0.6 + efficiencyScore * 0.4;
  }

  private matchTriangle(points: { x: number; y: number }[]): number {
    if (points.length < 10) return 0;

    const first = points[0];
    const last = points[points.length - 1];
    const closureDist = Math.hypot(last.x - first.x, last.y - first.y);
    const closureScore = Math.max(0, 1 - closureDist * 2);

    const corners = this.detectCorners(points);
    const cornerScore = corners >= 2 && corners <= 5 ? 1 - Math.abs(corners - 3) * 0.3 : 0;

    const totalAngle = this.calculateTotalAngle(points);
    const angleScore = Math.min(1, totalAngle / (Math.PI * 1.5));

    return closureScore * 0.3 + cornerScore * 0.5 + angleScore * 0.2;
  }

  private matchSpiral(points: { x: number; y: number }[]): number {
    if (points.length < 10) return 0;

    const totalAngle = this.calculateTotalAngle(points);
    const angleScore = Math.min(1, totalAngle / (Math.PI * 4));

    const radii: number[] = [];
    for (const p of points) {
      radii.push(Math.hypot(p.x, p.y));
    }

    let increasingTrend = 0;
    for (let i = 1; i < radii.length; i++) {
      if (radii[i] > radii[i - 1]) increasingTrend++;
    }
    const trendScore = increasingTrend / (radii.length - 1);

    return angleScore * 0.5 + trendScore * 0.5;
  }

  private matchInfinity(points: { x: number; y: number }[]): number {
    if (points.length < 10) return 0;

    const first = points[0];
    const last = points[points.length - 1];
    const closureDist = Math.hypot(last.x - first.x, last.y - first.y);
    const closureScore = Math.max(0, 1 - closureDist * 1.5);

    const leftCount = points.filter(p => p.x < 0).length;
    const rightCount = points.filter(p => p.x > 0).length;
    const balanceScore = 1 - Math.abs(leftCount - rightCount) / points.length;

    const totalAngle = this.calculateTotalAngle(points);
    const angleScore = Math.min(1, totalAngle / (Math.PI * 3));

    return closureScore * 0.3 + balanceScore * 0.3 + angleScore * 0.4;
  }

  private calculateTotalAngle(points: { x: number; y: number }[]): number {
    let totalAngle = 0;
    for (let i = 2; i < points.length; i++) {
      const v1x = points[i - 1].x - points[i - 2].x;
      const v1y = points[i - 1].y - points[i - 2].y;
      const v2x = points[i].x - points[i - 1].x;
      const v2y = points[i].y - points[i - 1].y;

      const cross = v1x * v2y - v1y * v2x;
      const dot = v1x * v2x + v1y * v2y;
      totalAngle += Math.atan2(cross, dot);
    }
    return Math.abs(totalAngle);
  }

  private detectCorners(points: { x: number; y: number }[]): number {
    let corners = 0;
    const window = 3;
    for (let i = window; i < points.length - window; i++) {
      const prev = points[i - window];
      const curr = points[i];
      const next = points[i + window];

      const v1x = curr.x - prev.x;
      const v1y = curr.y - prev.y;
      const v2x = next.x - curr.x;
      const v2y = next.y - curr.y;

      const dot = v1x * v2x + v1y * v2y;
      const mag1 = Math.hypot(v1x, v1y);
      const mag2 = Math.hypot(v2x, v2y);

      if (mag1 > 0.01 && mag2 > 0.01) {
        const cosAngle = dot / (mag1 * mag2);
        if (cosAngle < 0.3) {
          corners++;
          i += window;
        }
      }
    }
    return corners;
  }
}
