import { MineBlock } from './MineGenerator';
import { ExcavatorController } from './ExcavatorController';

export interface Particle {
  sprite: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface CollisionCallbacks {
  onBlockDestroyed: (block: MineBlock) => void;
  onScoreGain: (score: number) => void;
  onDamage: (amount: number) => void;
  onGoldCollected: () => void;
}

const MAX_PARTICLES = 80;

export class CollisionManager {
  private scene: Phaser.Scene;
  private excavator: ExcavatorController;
  private callbacks: CollisionCallbacks;
  private particlePool: Particle[] = [];
  private particlePoolIndex = 0;

  constructor(
    scene: Phaser.Scene,
    excavator: ExcavatorController,
    callbacks: CollisionCallbacks
  ) {
    this.scene = scene;
    this.excavator = excavator;
    this.callbacks = callbacks;
    this.initParticlePool();
  }

  private initParticlePool(): void {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const sprite = this.scene.add.rectangle(0, 0, 6, 6, 0xFFFFFF);
      sprite.setAlpha(0);
      sprite.setActive(false);
      this.particlePool.push({
        sprite,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 300,
        active: false
      });
    }
  }

  private getParticle(): Particle {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const idx = (this.particlePoolIndex + i) % MAX_PARTICLES;
      if (!this.particlePool[idx].active) {
        this.particlePoolIndex = (idx + 1) % MAX_PARTICLES;
        return this.particlePool[idx];
      }
    }
    this.particlePoolIndex = (this.particlePoolIndex + 1) % MAX_PARTICLES;
    return this.particlePool[this.particlePoolIndex];
  }

  spawnParticles(x: number, y: number, color: number, count: number = 16): void {
    for (let i = 0; i < count; i++) {
      const particle = this.getParticle();
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 80 + Math.random() * 120;

      particle.sprite.setPosition(x, y);
      particle.sprite.setFillStyle(color);
      particle.sprite.setAlpha(1);
      particle.sprite.setSize(4 + Math.random() * 4, 4 + Math.random() * 4);
      particle.sprite.setActive(true);
      particle.sprite.setVisible(true);

      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - 50;
      particle.life = 300;
      particle.maxLife = 300;
      particle.active = true;
    }
  }

  updateParticles(deltaTime: number): void {
    const dt = deltaTime / 1000;
    const gravity = 200;

    for (const particle of this.particlePool) {
      if (!particle.active) continue;

      particle.life -= deltaTime;
      if (particle.life <= 0) {
        particle.active = false;
        particle.sprite.setAlpha(0);
        particle.sprite.setActive(false);
        particle.sprite.setVisible(false);
        continue;
      }

      particle.vy += gravity * dt;
      particle.sprite.x += particle.vx * dt;
      particle.sprite.y += particle.vy * dt;
      particle.sprite.setAlpha(particle.life / particle.maxLife);
    }
  }

  checkCollisions(blocks: MineBlock[]): void {
    const bucket = this.excavator.getBucketWorldPosition();

    for (const block of blocks) {
      if (block.destroyed) continue;

      if (this.checkCircleRectCollision(bucket.x, bucket.y, bucket.radius, block)) {
        this.handleBlockCollision(block);
      }
    }
  }

  private checkCircleRectCollision(
    cx: number,
    cy: number,
    cr: number,
    block: MineBlock
  ): boolean {
    const closestX = Math.max(block.x, Math.min(cx, block.x + block.width));
    const closestY = Math.max(block.y, Math.min(cy, block.y + block.height));

    const dx = cx - closestX;
    const dy = cy - closestY;

    return (dx * dx + dy * dy) < (cr * cr);
  }

  private handleBlockCollision(block: MineBlock): void {
    const isClosed = this.excavator.isBucketClosed();
    const currentForce = this.excavator.getCurrentForce();
    const blockHardness = block.config.hardness;

    if (isClosed && this.excavator.canDig()) {
      if (blockHardness <= currentForce) {
        if (this.excavator.consumeSteamForDig()) {
          this.destroyBlock(block);
        }
      } else {
        this.callbacks.onDamage(5);
        this.scene.cameras.main.shake(200, 0.01);
      }
    }
  }

  private destroyBlock(block: MineBlock): void {
    block.destroyed = true;

    const centerX = block.x + block.width / 2;
    const centerY = block.y + block.height / 2;
    this.spawnParticles(centerX, centerY, block.config.color, 16);

    if (block.sprite) {
      block.sprite.destroy();
    }

    this.callbacks.onScoreGain(block.config.score);
    this.callbacks.onBlockDestroyed(block);

    if (block.type === 'gold') {
      this.callbacks.onGoldCollected();
    }
  }

  checkRockCollision(
    rockX: number,
    rockY: number,
    rockRadius: number,
    excavatorX: number,
    excavatorY: number,
    excavatorRadius: number
  ): boolean {
    const dx = rockX - excavatorX;
    const dy = rockY - excavatorY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (rockRadius + excavatorRadius);
  }
}
