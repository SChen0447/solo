export type TerrainType =
  | 'platform'
  | 'slope_left_high'
  | 'slope_right_high'
  | 'moving_platform'
  | 'speed_boost'
  | 'teleport'
  | 'obstacle';

export type CollisionType = 'static' | 'dynamic' | 'one_way';

export interface BaseTerrain {
  id: string;
  type: TerrainType;
  x: number;
  y: number;
  width: number;
  height: number;
  collisionType: CollisionType;
}

export interface MovingPlatformTerrain extends BaseTerrain {
  type: 'moving_platform';
  pathType: 'horizontal' | 'vertical';
  pathLength: number;
  period: number;
  phase: number;
}

export interface SpeedBoostTerrain extends BaseTerrain {
  type: 'speed_boost';
  direction: 'left' | 'right' | 'up' | 'down';
  boostMultiplier: number;
}

export interface TeleportTerrain extends BaseTerrain {
  type: 'teleport';
  targetId: string | null;
}

export type Terrain =
  | BaseTerrain
  | MovingPlatformTerrain
  | SpeedBoostTerrain
  | TeleportTerrain;

export interface CharacterState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  isOnGround: boolean;
  isOnSlope: boolean;
  isOnMovingPlatform: boolean;
  attachedPlatformId: string | null;
  stunned: boolean;
  stunTimer: number;
  blinkTimer: number;
}

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

const generateId = (): string => Math.random().toString(36).substring(2, 11);

export class TerrainData {
  private terrains: Terrain[] = [];

  addTerrain(
    type: TerrainType,
    x: number,
    y: number,
    width: number = 100,
    height: number = 20
  ): Terrain {
    let collisionType: CollisionType = 'static';
    if (type === 'moving_platform') collisionType = 'dynamic';
    if (type === 'speed_boost' || type === 'teleport') collisionType = 'one_way';

    const base: BaseTerrain = {
      id: generateId(),
      type,
      x,
      y,
      width,
      height,
      collisionType
    };

    let terrain: Terrain = base;

    if (type === 'moving_platform') {
      terrain = {
        ...base,
        type: 'moving_platform',
        pathType: 'horizontal',
        pathLength: 150,
        period: 2,
        phase: 0
      } as MovingPlatformTerrain;
    } else if (type === 'speed_boost') {
      terrain = {
        ...base,
        type: 'speed_boost',
        direction: 'right',
        boostMultiplier: 1.5
      } as SpeedBoostTerrain;
    } else if (type === 'teleport') {
      terrain = {
        ...base,
        type: 'teleport',
        targetId: null
      } as TeleportTerrain;
    }

    this.terrains.push(terrain);
    return terrain;
  }

  removeTerrain(id: string): boolean {
    const index = this.terrains.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.terrains.splice(index, 1);
      return true;
    }
    return false;
  }

  moveTerrain(id: string, x: number, y: number): boolean {
    const terrain = this.terrains.find((t) => t.id === id);
    if (terrain) {
      terrain.x = x;
      terrain.y = y;
      return true;
    }
    return false;
  }

  getTerrainAt(x: number, y: number): Terrain | null {
    for (let i = this.terrains.length - 1; i >= 0; i--) {
      const t = this.terrains[i];
      if (x >= t.x && x <= t.x + t.width && y >= t.y && y <= t.y + t.height) {
        return t;
      }
    }
    return null;
  }

  getTerrains(): Terrain[] {
    return this.terrains;
  }

  updateMovingPlatforms(deltaTime: number): void {
    for (const t of this.terrains) {
      if (t.type === 'moving_platform') {
        const mp = t as MovingPlatformTerrain;
        mp.phase += deltaTime / mp.period;
        if (mp.phase > 1) mp.phase -= 1;
      }
    }
  }

  getPlatformCurrentPosition(terrain: MovingPlatformTerrain): {
    x: number;
    y: number;
    dx: number;
    dy: number;
  } {
    const progress = Math.sin(terrain.phase * Math.PI * 2) * 0.5 + 0.5;
    if (terrain.pathType === 'horizontal') {
      const newX = terrain.x + progress * terrain.pathLength;
      const prevProgress =
        Math.sin((terrain.phase - 0.016 / terrain.period) * Math.PI * 2) * 0.5 +
        0.5;
      const prevX = terrain.x + prevProgress * terrain.pathLength;
      return { x: newX, y: terrain.y, dx: newX - prevX, dy: 0 };
    } else {
      const newY = terrain.y + progress * terrain.pathLength;
      const prevProgress =
        Math.sin((terrain.phase - 0.016 / terrain.period) * Math.PI * 2) * 0.5 +
        0.5;
      const prevY = terrain.y + prevProgress * terrain.pathLength;
      return { x: terrain.x, y: newY, dx: 0, dy: newY - prevY };
    }
  }

  clear(): void {
    this.terrains = [];
  }

  exportJSON(): string {
    const data = this.terrains.map((t) => {
      const base = {
        id: t.id,
        type: t.type,
        x: t.x,
        y: t.y,
        width: t.width,
        height: t.height,
        collisionType: t.collisionType
      };

      if (t.type === 'moving_platform') {
        const mp = t as MovingPlatformTerrain;
        return {
          ...base,
          pathType: mp.pathType,
          pathLength: mp.pathLength,
          period: mp.period
        };
      }
      if (t.type === 'speed_boost') {
        const sb = t as SpeedBoostTerrain;
        return {
          ...base,
          direction: sb.direction,
          boostMultiplier: sb.boostMultiplier
        };
      }
      if (t.type === 'teleport') {
        const tp = t as TeleportTerrain;
        return {
          ...base,
          targetId: tp.targetId
        };
      }
      return base;
    });

    return JSON.stringify(data, null, 2);
  }
}
