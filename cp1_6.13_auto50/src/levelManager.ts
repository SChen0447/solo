import type { MirrorData, PrismData, LensData, TargetData, EmitterData } from './lightManager';

export interface LevelData {
  id: number;
  name: string;
  hint: string;
  emitter: EmitterData;
  mirrors: MirrorData[];
  prism: PrismData | null;
  lenses: LensData[];
  target: TargetData;
  starColor: string;
  bgTint: string;
}

const levels: LevelData[] = [
  {
    id: 1,
    name: 'Level 1',
    hint: '旋转镜面，将激光反射至终点光圈',
    emitter: { x: 30, y: 300, direction: { x: 1, y: 0 }, color: '#ff3333' },
    mirrors: [
      { x: 350, y: 200, angle: 135, length: 60, width: 6 },
      { x: 550, y: 350, angle: 45, length: 60, width: 6 },
      { x: 250, y: 450, angle: 120, length: 60, width: 6 },
    ],
    prism: null,
    lenses: [],
    target: { x: 740, y: 150, radius: 20 },
    starColor: '#4466aa',
    bgTint: '#0a0e2a',
  },
  {
    id: 2,
    name: 'Level 2',
    hint: '利用棱镜分裂光线，让绿色光束到达终点',
    emitter: { x: 30, y: 300, direction: { x: 1, y: 0.1 }, color: '#ff3333' },
    mirrors: [
      { x: 300, y: 250, angle: 150, length: 60, width: 6 },
      { x: 500, y: 180, angle: 60, length: 60, width: 6 },
      { x: 400, y: 420, angle: 110, length: 60, width: 6 },
    ],
    prism: { x: 400, y: 300, size: 50, refractiveIndex: 1.52 },
    lenses: [],
    target: { x: 740, y: 300, radius: 20 },
    starColor: '#44aa66',
    bgTint: '#0a1e1a',
  },
  {
    id: 3,
    name: 'Level 3',
    hint: '镜面与棱镜配合，引导蓝色光束穿越障碍',
    emitter: { x: 30, y: 150, direction: { x: 1, y: 0.3 }, color: '#ff3333' },
    mirrors: [
      { x: 200, y: 300, angle: 160, length: 60, width: 6 },
      { x: 500, y: 400, angle: 30, length: 60, width: 6 },
      { x: 600, y: 200, angle: 135, length: 60, width: 6 },
    ],
    prism: { x: 350, y: 350, size: 50, refractiveIndex: 1.52 },
    lenses: [],
    target: { x: 740, y: 450, radius: 20 },
    starColor: '#8844aa',
    bgTint: '#140a2a',
  },
  {
    id: 4,
    name: 'Level 4',
    hint: '多重反射与棱镜折射的组合挑战',
    emitter: { x: 30, y: 450, direction: { x: 1, y: -0.5 }, color: '#ff3333' },
    mirrors: [
      { x: 200, y: 200, angle: 45, length: 60, width: 6 },
      { x: 450, y: 150, angle: 120, length: 60, width: 6 },
      { x: 600, y: 350, angle: 75, length: 60, width: 6 },
    ],
    prism: { x: 300, y: 300, size: 50, refractiveIndex: 1.52 },
    lenses: [],
    target: { x: 740, y: 100, radius: 20 },
    starColor: '#aa4466',
    bgTint: '#1a0a14',
  },
  {
    id: 5,
    name: 'Level 5',
    hint: '终极关卡：精准控制每条光路的走向',
    emitter: { x: 30, y: 100, direction: { x: 1, y: 0.6 }, color: '#ff3333' },
    mirrors: [
      { x: 250, y: 350, angle: 170, length: 60, width: 6 },
      { x: 500, y: 250, angle: 80, length: 60, width: 6 },
      { x: 650, y: 450, angle: 140, length: 60, width: 6 },
    ],
    prism: { x: 400, y: 200, size: 50, refractiveIndex: 1.52 },
    lenses: [],
    target: { x: 740, y: 500, radius: 20 },
    starColor: '#aa8844',
    bgTint: '#1a140a',
  },
];

export class LevelManager {
  private currentLevelIndex: number = 0;
  private transitionProgress: number = 0;
  private isTransitioning: boolean = false;
  private transitionDirection: 'in' | 'out' = 'in';

  getCurrentLevel(): LevelData {
    return levels[this.currentLevelIndex];
  }

  getCurrentLevelIndex(): number {
    return this.currentLevelIndex;
  }

  getTotalLevels(): number {
    return levels.length;
  }

  nextLevel(): boolean {
    if (this.currentLevelIndex < levels.length - 1) {
      this.currentLevelIndex++;
      return true;
    }
    return false;
  }

  resetToFirst(): void {
    this.currentLevelIndex = 0;
  }

  startTransition(): void {
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.transitionDirection = 'out';
  }

  updateTransition(dt: number): boolean {
    if (!this.isTransitioning) return false;

    const speed = 1 / 500;
    this.transitionProgress += dt * speed;

    if (this.transitionDirection === 'out' && this.transitionProgress >= 1) {
      this.transitionProgress = 0;
      this.transitionDirection = 'in';
      return true;
    }

    if (this.transitionDirection === 'in' && this.transitionProgress >= 1) {
      this.isTransitioning = false;
      this.transitionProgress = 0;
      return false;
    }

    return false;
  }

  isCurrentlyTransitioning(): boolean {
    return this.isTransitioning;
  }

  drawTransition(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.isTransitioning) return;

    const progress = this.transitionProgress;
    const numBlinds = 10;
    const blindWidth = width / numBlinds;
    let alpha: number;

    if (this.transitionDirection === 'out') {
      alpha = progress;
    } else {
      alpha = 1 - progress;
    }

    ctx.fillStyle = `rgba(10, 14, 26, ${alpha})`;
    for (let i = 0; i < numBlinds; i++) {
      const x = i * blindWidth;
      ctx.fillRect(x, 0, blindWidth * alpha, height);
    }
  }

  getLevelHint(levelIndex: number): string {
    if (levelIndex >= 0 && levelIndex < levels.length) {
      return levels[levelIndex].hint;
    }
    return '';
  }
}
