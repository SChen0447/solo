import {
  LevelData,
  Block,
  PressurePlate,
  ExitZone,
  Platform,
  Particle,
  Vector2,
} from './types';
import { ALL_LEVELS } from './levels/levels';

function createParticle(
  x: number,
  y: number,
  color: string,
  size: number,
  maxLife: number
): Particle {
  return {
    position: { x, y },
    velocity: { x: (Math.random() - 0.5) * 40, y: (Math.random() - 0.5) * 40 },
    size,
    color,
    life: maxLife,
    maxLife,
    active: true,
  };
}

export class Level {
  private currentIndex: number = 0;
  private data: LevelData;
  private blocks: Block[] = [];
  private plates: PressurePlate[] = [];
  private exit: ExitZone;
  private platforms: Platform[] = [];
  private timeRemaining: number = 0;
  private levelCompleted: boolean = false;

  constructor() {
    this.data = ALL_LEVELS[0];
    this.exit = this.cloneExit(this.data.exit);
    this.loadLevel(0);
  }

  private cloneExit(e: ExitZone): ExitZone {
    return {
      position: { ...e.position },
      size: { ...e.size },
      unlocked: e.unlocked,
      particles: [],
    };
  }

  loadLevel(index: number): void {
    if (index < 0 || index >= ALL_LEVELS.length) return;
    this.currentIndex = index;
    this.data = ALL_LEVELS[index];
    this.levelCompleted = false;

    this.blocks = this.data.blocks.map((b) => ({
      id: b.id,
      position: { ...b.position },
      velocity: { x: 0, y: 0 },
      mass: b.mass,
      size: b.size,
      attachedToPlayer: false,
      magneticParticles: [],
      initialPosition: { ...b.position },
    }));

    this.plates = this.data.plates.map((p) => ({
      ...p,
      position: { ...p.position },
      size: { ...p.size },
      activated: false,
    }));

    this.exit = this.cloneExit(this.data.exit);
    for (let i = 0; i < 15; i++) {
      const px = this.exit.position.x + Math.random() * this.exit.size.x;
      const py = this.exit.position.y + Math.random() * this.exit.size.y;
      const size = 2 + Math.random() * 2;
      const life = 1 + Math.random() * 2;
      this.exit.particles.push(createParticle(px, py, '#FFD700', size, life));
    }

    this.platforms = this.data.platforms.map((p) => ({
      ...p,
      position: { ...p.position },
      size: { ...p.size },
      initialPosition: { ...p.initialPosition },
      path: p.path ? p.path.map((pt) => ({ ...pt })) : undefined,
      pathSpeed: p.pathSpeed,
      pathIndex: p.pathIndex ?? 0,
      pathProgress: p.pathProgress ?? 0,
    }));

    this.timeRemaining = this.data.timeLimit ?? 0;
  }

  reset(): void {
    this.loadLevel(this.currentIndex);
  }

  nextLevel(): boolean {
    if (this.currentIndex + 1 < ALL_LEVELS.length) {
      this.loadLevel(this.currentIndex + 1);
      return true;
    }
    return false;
  }

  update(deltaTime: number): void {
    if (this.data.timeLimit !== undefined && this.timeRemaining > 0) {
      this.timeRemaining -= deltaTime;
      if (this.timeRemaining < 0) this.timeRemaining = 0;
    }

    for (const plat of this.platforms) {
      if (plat.path && plat.path.length >= 2 && plat.pathSpeed) {
        const totalPoints = plat.path.length;
        const from = plat.path[plat.pathIndex ?? 0];
        const to = plat.path[((plat.pathIndex ?? 0) + 1) % totalPoints];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const moveAmount = plat.pathSpeed * deltaTime;
          plat.pathProgress = (plat.pathProgress ?? 0) + moveAmount / dist;
          while (plat.pathProgress >= 1) {
            plat.pathProgress -= 1;
            plat.pathIndex = ((plat.pathIndex ?? 0) + 1) % totalPoints;
          }
          const curFrom = plat.path[plat.pathIndex ?? 0];
          const curTo = plat.path[((plat.pathIndex ?? 0) + 1) % totalPoints];
          const t = plat.pathProgress ?? 0;
          plat.position.x = curFrom.x + (curTo.x - curFrom.x) * t;
          plat.position.y = curFrom.y + (curTo.y - curFrom.y) * t;
        }
      }
    }

    for (const block of this.blocks) {
      if (block.magneticParticles.length > 0) {
        for (const p of block.magneticParticles) {
          if (!p.active) continue;
          p.life -= deltaTime;
          if (p.life <= 0) {
            p.active = false;
            continue;
          }
          p.position.x += p.velocity.x * deltaTime;
          p.position.y += p.velocity.y * deltaTime;
        }
        block.magneticParticles = block.magneticParticles.filter((p) => p.active);
      }
    }

    for (const p of this.exit.particles) {
      p.life -= deltaTime;
      if (p.life <= 0) {
        p.life = p.maxLife;
        p.position.x = this.exit.position.x + Math.random() * this.exit.size.x;
        p.position.y = this.exit.position.y + Math.random() * this.exit.size.y;
      }
    }
  }

  checkPlates(): void {
    for (const plate of this.plates) {
      let active = false;
      for (const block of this.blocks) {
        if (block.id !== plate.targetBlockId) continue;
        const bx1 = block.position.x - block.size / 2;
        const by1 = block.position.y - block.size / 2;
        const bx2 = block.position.x + block.size / 2;
        const by2 = block.position.y + block.size / 2;
        const px1 = plate.position.x;
        const py1 = plate.position.y;
        const px2 = plate.position.x + plate.size.x;
        const py2 = plate.position.y + plate.size.y;
        if (
          bx1 < px2 &&
          bx2 > px1 &&
          by1 < py2 &&
          by2 > py1 &&
          block.position.y + block.size / 2 <= plate.position.y + plate.size.y + 5
        ) {
          active = true;
          break;
        }
      }
      plate.activated = active;
    }

    this.exit.unlocked = this.plates.every((p) => p.activated);
  }

  spawnMagneticParticles(block: Block, pole: 'N' | 'S'): void {
    if (block.magneticParticles.length >= 20) return;
    const color = pole === 'N' ? '#FF6666' : '#6699FF';
    for (let i = 0; i < 2; i++) {
      const px = block.position.x + (Math.random() - 0.5) * block.size;
      const py = block.position.y + (Math.random() - 0.5) * block.size;
      block.magneticParticles.push(
        createParticle(px, py, color, 2 + Math.random() * 1.5, 0.4 + Math.random() * 0.3)
      );
    }
  }

  isTimeUp(): boolean {
    return this.data.timeLimit !== undefined && this.timeRemaining <= 0;
  }

  getTimeRemaining(): number {
    return this.timeRemaining;
  }

  hasTimeLimit(): boolean {
    return this.data.timeLimit !== undefined;
  }

  getBlocks(): ReadonlyArray<Block> {
    return this.blocks;
  }

  getPlates(): ReadonlyArray<PressurePlate> {
    return this.plates;
  }

  getExit(): Readonly<ExitZone> {
    return this.exit;
  }

  getPlatforms(): ReadonlyArray<Platform> {
    return this.platforms;
  }

  getLevelData(): Readonly<LevelData> {
    return this.data;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getTotalLevels(): number {
    return ALL_LEVELS.length;
  }

  setLevelCompleted(v: boolean): void {
    this.levelCompleted = v;
  }

  isCompleted(): boolean {
    return this.levelCompleted;
  }

  getBlockById(id: number): Block | undefined {
    return this.blocks.find((b) => b.id === id);
  }

  getBlockPositions(): Vector2[] {
    return this.blocks.map((b) => ({ ...b.position }));
  }
}
