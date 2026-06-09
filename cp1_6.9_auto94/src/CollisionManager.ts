import Phaser from 'phaser';
import { PlayerState } from './PlayerController';
import { MazeGenerator, PetalData, CrystalData } from './MazeGenerator';
import { ParticleEffects } from './ParticleEffects';

export interface CollisionEvent {
  type: 'crystal' | 'petal';
  crystalId?: number;
  crystalX?: number;
  crystalY?: number;
  petalAngle?: number;
  petalX?: number;
  petalY?: number;
}

export class CollisionManager {
  private scene: Phaser.Scene;
  private maze: MazeGenerator;
  private particles: ParticleEffects;
  private petalCooldowns: Map<number, number> = new Map();
  private crystalCooldowns: Map<number, number> = new Map();

  constructor(
    scene: Phaser.Scene,
    maze: MazeGenerator,
    particles: ParticleEffects
  ) {
    this.scene = scene;
    this.maze = maze;
    this.particles = particles;
  }

  public checkCollisions(player: PlayerState): CollisionEvent[] {
    const events: CollisionEvent[] = [];
    const now = Date.now();

    const crystals = this.maze.getCrystals();
    for (const crystal of crystals) {
      if (crystal.collected) continue;
      const dx = player.x - crystal.x;
      const dy = player.y - crystal.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 20) {
        const cd = this.crystalCooldowns.get(crystal.id) ?? 0;
        if (now - cd > 100) {
          this.crystalCooldowns.set(crystal.id, now);
          this.handleCrystalCollection(crystal);
          events.push({
            type: 'crystal',
            crystalId: crystal.id,
            crystalX: crystal.x,
            crystalY: crystal.y
          });
        }
      }
    }

    const petals = this.maze.getPetals();
    for (const petal of petals) {
      const dx = player.x - petal.x;
      const dy = player.y - petal.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < petal.radius + 10) {
        const cd = this.petalCooldowns.get(petal.id) ?? 0;
        if (now - cd > 600) {
          this.petalCooldowns.set(petal.id, now);
          const angle = Math.atan2(dy, dx);
          this.handlePetalCollision(petal, angle);
          events.push({
            type: 'petal',
            petalAngle: angle,
            petalX: petal.x,
            petalY: petal.y
          });
        }
      }
    }

    return events;
  }

  private handleCrystalCollection(crystal: CrystalData): void {
    this.particles.emitCrystalBurst(crystal.x, crystal.y);
    this.maze.markCrystalCollected(crystal.id);
  }

  private handlePetalCollision(petal: PetalData, angle: number): void {
    this.particles.emitEnergyBlast(petal.x, petal.y);
    const flash = this.scene.add.graphics();
    flash.setDepth(9999);
    let flashCount = 0;
    const doFlash = () => {
      flash.clear();
      flash.fillStyle(0xff0000, 0.3);
      flash.fillRect(0, 0, 1200, 800);
      this.scene.time.delayedCall(300, () => {
        flash.clear();
        flashCount++;
        if (flashCount < 2) {
          this.scene.time.delayedCall(100, doFlash);
        } else {
          flash.destroy();
        }
      });
    };
    doFlash();
  }

  public destroy(): void {
    this.petalCooldowns.clear();
    this.crystalCooldowns.clear();
  }
}
