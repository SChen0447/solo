import SimplexNoise from 'simplex-noise';
import { v4 as uuidv4 } from 'uuid';
import {
  Decoration,
  GAME_CONFIG,
  Obstacle,
  ObstacleType,
  Platform,
  PlatformType,
  Spore,
  WorldMap,
} from './types';
import { randInt, randRange } from './utils';

export class WorldGenerator {
  private noise: SimplexNoise;
  private seed: number;

  constructor() {
    this.seed = Math.random();
    this.noise = new SimplexNoise(() => Math.random());
  }

  private noise2D(x: number, y: number): number {
    return this.noise.noise2D(x, y);
  }

  public regenerate(): void {
    this.seed = Math.random();
    this.noise = new SimplexNoise(() => Math.random());
  }

  public generate(): WorldMap {
    this.regenerate();

    const platforms = this.generatePlatforms();
    const spores = this.generateSpores(platforms);
    const obstacles = this.generateObstacles(platforms);
    const decorations = this.generateDecorations();

    return {
      width: GAME_CONFIG.WORLD_WIDTH,
      height: GAME_CONFIG.CANVAS_HEIGHT,
      platforms,
      spores,
      obstacles,
      decorations,
      goalX: GAME_CONFIG.WORLD_WIDTH - 100,
    };
  }

  private generatePlatforms(): Platform[] {
    const platforms: Platform[] = [];
    const { WORLD_WIDTH, GROUND_Y, PLATFORM_HEIGHT, FLOATING_PLATFORM_WIDTH } = GAME_CONFIG;

    let x = 0;
    while (x < WORLD_WIDTH) {
      const noiseVal = this.noise2D(x * 0.003 + this.seed * 100, 0);
      const gapChance = this.noise2D(x * 0.005 + this.seed * 200, 10);

      if (gapChance > 0.3 && x > 200 && x < WORLD_WIDTH - 300) {
        const gapWidth = randInt(80, 160);
        x += gapWidth;
        continue;
      }

      const width = Math.max(80, Math.floor(120 + noiseVal * 80));
      platforms.push({
        id: uuidv4(),
        type: PlatformType.GROUND,
        x,
        y: GROUND_Y,
        width: Math.min(width, WORLD_WIDTH - x),
        height: PLATFORM_HEIGHT,
        breaking: false,
        breakTimer: 0,
        broken: false,
      });
      x += width;
    }

    let floatingX = 300;
    let lastY = GROUND_Y - 120;

    while (floatingX < WORLD_WIDTH - 400) {
      const noiseY = this.noise2D(floatingX * 0.008 + this.seed * 300, 50);
      const noiseType = this.noise2D(floatingX * 0.01 + this.seed * 400, 150);

      const targetY = GROUND_Y - 100 + noiseY * 140;
      const y = Math.max(200, Math.min(GROUND_Y - 80, lastY + randRange(-60, 60)));
      const clampedY = Math.max(200, Math.min(GROUND_Y - 80, (y + targetY) / 2));

      const type: PlatformType = noiseType > 0.5 ? PlatformType.ICE : PlatformType.FLOATING;

      platforms.push({
        id: uuidv4(),
        type,
        x: floatingX,
        y: clampedY,
        width: FLOATING_PLATFORM_WIDTH,
        height: 20,
        breaking: false,
        breakTimer: 0,
        broken: false,
      });

      lastY = clampedY;
      floatingX += randInt(120, 180);
    }

    return platforms;
  }

  private generateSpores(platforms: Platform[]): Spore[] {
    const spores: Spore[] = [];
    const count = randInt(50, 80);
    const { WORLD_WIDTH, GROUND_Y } = GAME_CONFIG;

    const placedPositions: Set<string> = new Set();

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let placed = false;

      while (!placed && attempts < 50) {
        attempts++;
        const usePlatform = Math.random() < 0.6;

        if (usePlatform && platforms.length > 0) {
          const platform = platforms[randInt(0, platforms.length - 1)];
          if (platform.broken) continue;

          const sporeX = platform.x + randRange(10, platform.width - 10);
          const sporeY = platform.y - 40 - randRange(0, 40);
          const key = `${Math.floor(sporeX / 20)}-${Math.floor(sporeY / 20)}`;

          if (!placedPositions.has(key) && sporeX > 100 && sporeX < WORLD_WIDTH - 100) {
            placedPositions.add(key);
            spores.push({
              id: uuidv4(),
              x: sporeX,
              y: sporeY,
              baseY: sporeY,
              radius: 8,
              collected: false,
              floatPhase: Math.random() * Math.PI * 2,
            });
            placed = true;
          }
        } else {
          const sporeX = randRange(150, WORLD_WIDTH - 150);
          const sporeY = randRange(150, GROUND_Y - 60);
          const key = `${Math.floor(sporeX / 20)}-${Math.floor(sporeY / 20)}`;

          if (!placedPositions.has(key)) {
            placedPositions.add(key);
            spores.push({
              id: uuidv4(),
              x: sporeX,
              y: sporeY,
              baseY: sporeY,
              radius: 8,
              collected: false,
              floatPhase: Math.random() * Math.PI * 2,
            });
            placed = true;
          }
        }
      }
    }

    return spores;
  }

  private generateObstacles(platforms: Platform[]): Obstacle[] {
    const obstacles: Obstacle[] = [];
    const { WORLD_WIDTH, GROUND_Y } = GAME_CONFIG;

    const groundPlatforms = platforms.filter((p) => p.type === PlatformType.GROUND && p.width > 150);

    for (let i = 0; i < 8; i++) {
      if (groundPlatforms.length === 0) break;
      const platform = groundPlatforms[randInt(0, groundPlatforms.length - 1)];
      const obsX = platform.x + randRange(30, platform.width - 30);
      if (obsX < 250 || obsX > WORLD_WIDTH - 200) continue;

      obstacles.push({
        id: uuidv4(),
        type: ObstacleType.POISON_MUSHROOM,
        x: obsX,
        y: GROUND_Y - 30,
        baseX: obsX,
        baseY: GROUND_Y - 30,
        radius: 20,
        scale: 1,
        targetScale: 1,
        swellTimer: 0,
        recoverTimer: 0,
        angle: 0,
        orbitPhase: Math.random() * Math.PI * 2,
        hitFlash: 0,
      });
    }

    for (let i = 0; i < 5; i++) {
      if (groundPlatforms.length === 0) break;
      const platform = groundPlatforms[randInt(0, groundPlatforms.length - 1)];
      const obsX = platform.x + randRange(30, platform.width - 30);
      if (obsX < 350 || obsX > WORLD_WIDTH - 200) continue;

      obstacles.push({
        id: uuidv4(),
        type: ObstacleType.SWELL_MUSHROOM,
        x: obsX,
        y: GROUND_Y - 25,
        baseX: obsX,
        baseY: GROUND_Y - 25,
        radius: 18,
        scale: 1,
        targetScale: 1,
        swellTimer: 0,
        recoverTimer: 0,
        angle: 0,
        orbitPhase: Math.random() * Math.PI * 2,
        hitFlash: 0,
      });
    }

    for (let i = 0; i < 4; i++) {
      const obsX = randRange(500, WORLD_WIDTH - 300);
      const obsY = randRange(250, GROUND_Y - 100);

      obstacles.push({
        id: uuidv4(),
        type: ObstacleType.THORN_WHEEL,
        x: obsX,
        y: obsY,
        baseX: obsX,
        baseY: obsY,
        radius: 22,
        scale: 1,
        targetScale: 1,
        swellTimer: 0,
        recoverTimer: 0,
        angle: 0,
        orbitPhase: Math.random() * Math.PI * 2,
        hitFlash: 0,
      });
    }

    return obstacles;
  }

  private generateDecorations(): Decoration[] {
    const decorations: Decoration[] = [];
    const { WORLD_WIDTH, GROUND_Y } = GAME_CONFIG;

    for (let layer = 0; layer < 2; layer++) {
      const count = layer === 0 ? 15 : 25;
      for (let i = 0; i < count; i++) {
        const typeRoll = Math.random();
        let type: Decoration['type'];
        if (typeRoll < 0.4) type = 'tree';
        else if (typeRoll < 0.7) type = 'bush';
        else type = 'mushroom_deco';

        decorations.push({
          id: uuidv4(),
          type,
          x: randRange(0, WORLD_WIDTH),
          y: GROUND_Y - (layer === 0 ? randRange(10, 30) : randRange(5, 15)),
          scale: layer === 0 ? randRange(0.8, 1.2) : randRange(0.5, 0.8),
          layer,
        });
      }
    }

    return decorations.sort((a, b) => a.layer - b.layer);
  }
}
