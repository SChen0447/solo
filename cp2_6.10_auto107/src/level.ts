export type PlatformSize = 'small' | 'medium' | 'large';

export interface Platform {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  size: PlatformSize;
  scale: number;
  scaleTarget: number;
  scaleStartTime: number;
  isReachable: boolean;
}

export interface JumpParams {
  jumpPower: number;
  horizontalSpeed: number;
  gravityMultiplier: number;
}

export interface LevelData {
  version: string;
  platforms: Platform[];
  jumpParams: JumpParams;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  savedAt: string;
}

export const GRID_SIZE = 32;
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 400;

export const PLATFORM_SPECS: Record<PlatformSize, { width: number; height: number; color: string }> = {
  small: { width: 40, height: 20, color: '#8B5A2B' },
  medium: { width: 80, height: 20, color: '#A9A9A9' },
  large: { width: 120, height: 20, color: '#4682B4' }
};

export const START_POINT = { x: 50, y: 340, width: 30, height: 30 };
export const END_POINT = { x: 740, y: 320, radius: 20 };

function generateId(): string {
  return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

export class LevelManager {
  private platforms: Platform[] = [];
  public jumpParams: JumpParams = {
    jumpPower: 100,
    horizontalSpeed: 200,
    gravityMultiplier: 1.0
  };
  private listeners: Set<() => void> = new Set();

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach(cb => cb());
  }

  getAllPlatforms(): Platform[] {
    return this.platforms;
  }

  getPlatformById(id: string): Platform | undefined {
    return this.platforms.find(p => p.id === id);
  }

  snapToGrid(x: number, y: number): { x: number; y: number } {
    return {
      x: Math.round(x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(y / GRID_SIZE) * GRID_SIZE
    };
  }

  clampPosition(x: number, y: number, width: number, height: number): { x: number; y: number } {
    return {
      x: Math.max(0, Math.min(CANVAS_WIDTH - width, x)),
      y: Math.max(0, Math.min(CANVAS_HEIGHT - height, y))
    };
  }

  createPlatform(size: PlatformSize, x: number, y: number, animate: boolean = true): Platform {
    const spec = PLATFORM_SPECS[size];
    const snapped = this.snapToGrid(x, y);
    const clamped = this.clampPosition(snapped.x, snapped.y, spec.width, spec.height);
    const now = performance.now();
    return {
      id: generateId(),
      x: clamped.x,
      y: clamped.y,
      width: spec.width,
      height: spec.height,
      color: spec.color,
      size,
      scale: animate ? 0 : 1,
      scaleTarget: 1,
      scaleStartTime: now,
      isReachable: true
    };
  }

  addPlatform(platform: Platform): void {
    this.platforms.push(platform);
    this.notify();
  }

  addPlatformAt(size: PlatformSize, x: number, y: number): Platform {
    const platform = this.createPlatform(size, x, y);
    this.addPlatform(platform);
    return platform;
  }

  removePlatform(id: string): void {
    this.platforms = this.platforms.filter(p => p.id !== id);
    this.notify();
  }

  updatePlatform(id: string, changes: Partial<Platform>): void {
    const platform = this.platforms.find(p => p.id === id);
    if (platform) {
      Object.assign(platform, changes);
      this.notify();
    }
  }

  updateJumpParams(params: Partial<JumpParams>): void {
    Object.assign(this.jumpParams, params);
    this.notify();
  }

  clearPlatforms(): void {
    this.platforms = [];
    this.notify();
  }

  setPlatformReachability(reachableIds: Set<string>): void {
    this.platforms.forEach(p => {
      p.isReachable = reachableIds.has(p.id);
    });
    this.notify();
  }

  resetReachability(): void {
    this.platforms.forEach(p => {
      p.isReachable = true;
    });
    this.notify();
  }

  serialize(): LevelData {
    return {
      version: '1.0.0',
      platforms: this.platforms.map(p => ({ ...p })),
      jumpParams: { ...this.jumpParams },
      startPoint: { x: START_POINT.x, y: START_POINT.y },
      endPoint: { x: END_POINT.x, y: END_POINT.y },
      savedAt: new Date().toISOString()
    };
  }

  deserialize(data: LevelData): Promise<void> {
    return new Promise((resolve) => {
      this.platforms = [];
      if (data.jumpParams) {
        this.jumpParams = { ...data.jumpParams };
      }
      this.notify();

      const platformsToRestore = data.platforms || [];
      let index = 0;

      const addNext = () => {
        if (index >= platformsToRestore.length) {
          resolve();
          return;
        }
        const raw = platformsToRestore[index];
        const platform: Platform = {
          id: raw.id || generateId(),
          x: raw.x,
          y: raw.y,
          width: raw.width,
          height: raw.height,
          color: raw.color,
          size: raw.size,
          scale: 0,
          scaleTarget: 1,
          scaleStartTime: performance.now(),
          isReachable: true
        };
        this.platforms.push(platform);
        this.notify();
        index++;
        setTimeout(addNext, 100);
      };
      addNext();
    });
  }

  updatePlatformAnimations(now: number): boolean {
    let needsRender = false;
    const duration = 200;
    for (const p of this.platforms) {
      if (p.scale < p.scaleTarget) {
        const elapsed = now - p.scaleStartTime;
        const t = Math.min(1, elapsed / duration);
        const eased = this.easeOutElastic(t);
        p.scale = p.scaleTarget * eased;
        if (p.scale > p.scaleTarget) p.scale = p.scaleTarget;
        needsRender = true;
      } else if (p.scale > p.scaleTarget) {
        p.scale = p.scaleTarget;
        needsRender = true;
      }
    }
    return needsRender;
  }

  private easeOutElastic(t: number): number {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const p = 0.3;
    const overshoot = 1.2;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) * overshoot + 1;
  }
}
