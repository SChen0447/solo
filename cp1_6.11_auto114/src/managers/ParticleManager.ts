import Phaser from 'phaser';
import { ColorGroup } from '../types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: number;
  life: number;
  maxLife: number;
  graphics: Phaser.GameObjects.Arc;
}

export class ParticleManager {
  private scene: Phaser.Scene;
  private particles: Particle[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  spawnGrappleBurst(x: number, y: number): void {
    const colors = [0x00d4ff, 0xff6b9d, 0x9d00ff, 0x0080ff];

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
      const speed = Phaser.Math.Between(80, 200);
      const size = Phaser.Math.Between(3, 6);
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.createParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, size, color, 500);
    }
  }

  spawnComboGlow(group: ColorGroup, width: number, height: number): void {
    const color = group === 'warm' ? 0xff8c00 : 0x00bfff;
    const graphics = this.scene.add.graphics();
    let progress = 0;
    const duration = 300;
    const startTime = this.scene.time.now;

    const update = () => {
      progress = (this.scene.time.now - startTime) / duration;
      if (progress >= 1) {
        graphics.destroy();
        return;
      }

      graphics.clear();
      const alpha = Math.sin(progress * Math.PI) * 0.5;
      const thickness = 30 + progress * 20;

      graphics.lineStyle(thickness, color, alpha);
      graphics.strokeRect(0, 0, width, height);

      this.scene.time.delayedCall(16, update);
    };

    update();
  }

  private createParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    color: number,
    life: number
  ): void {
    const graphics = this.scene.add.circle(x, y, size, color, 1);

    this.particles.push({
      x,
      y,
      vx,
      vy,
      size,
      color,
      life,
      maxLife: life,
      graphics
    });
  }

  update(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= delta;
      p.x += (p.vx * delta) / 1000;
      p.y += (p.vy * delta) / 1000;
      p.vy += (400 * delta) / 1000;

      const alpha = Math.max(0, p.life / p.maxLife);
      p.graphics.setPosition(p.x, p.y);
      p.graphics.setAlpha(alpha);
      p.graphics.setScale(alpha);

      if (p.life <= 0) {
        p.graphics.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  destroy(): void {
    for (const p of this.particles) {
      p.graphics.destroy();
    }
    this.particles = [];
  }
}
