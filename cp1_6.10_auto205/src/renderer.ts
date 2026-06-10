export interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface ShockWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  life: number;
}

export interface UpgradeText {
  text: string;
  life: number;
  maxLife: number;
}

export interface FlashEffect {
  alpha: number;
  life: number;
}

export interface OreCounter {
  scale: number;
  targetScale: number;
  life: number;
}

export class Renderer {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  stars: Star[];
  particles: Particle[];
  shockWaves: ShockWave[];
  upgradeTexts: UpgradeText[];
  flashEffect: FlashEffect | null = null;
  oreCounter: OreCounter;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.oreCounter = { scale: 1, targetScale: 1, life: 0 };
    this.stars = this.generateStars(100);
    this.particles = [];
    this.shockWaves = [];
    this.upgradeTexts = [];
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.stars = this.generateStars(100);
  }

  generateStars(count: number): Star[] {
    const stars: Star[] = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return stars;
  }

  drawBackground(time: number): void {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      0,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.7
    );
    gradient.addColorStop(0, '#1a0b2e');
    gradient.addColorStop(1, '#0b0410');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    for (const star of this.stars) {
      const alpha = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(time * 0.002 + star.phase));
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawOreCounter(ore: number): void {
    if (this.oreCounter.life > 0) {
      this.oreCounter.life--;
      const t = 1 - this.oreCounter.life / 12;
      if (t < 0.5) {
        this.oreCounter.scale = 1 + 0.4 * (t * 2);
      } else {
        this.oreCounter.scale = 1.4 - 0.4 * ((t - 0.5) * 2);
      }
    } else {
      this.oreCounter.scale = 1;
    }

    this.ctx.save();
    this.ctx.font = '18px monospace';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'top';
    const text = `矿石: ${ore}`;
    const x = this.width - 20;
    const y = 20;
    this.ctx.translate(x, y + 9);
    this.ctx.scale(this.oreCounter.scale, this.oreCounter.scale);
    this.ctx.translate(-x, -(y + 9));
    this.ctx.fillText(text, x, y);
    this.ctx.restore();
  }

  triggerOrePulse(): void {
    this.oreCounter.life = 12;
  }

  drawPlayer(x: number, y: number, hasShield: boolean, shieldBlink: number): void {
    this.ctx.save();
    this.ctx.shadowColor = '#81d4fa';
    this.ctx.shadowBlur = 10;
    this.ctx.fillStyle = '#4fc3f7';
    this.ctx.beginPath();
    this.ctx.moveTo(x, y - 16);
    this.ctx.lineTo(x - 8, y + 16);
    this.ctx.lineTo(x + 8, y + 16);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = '#81d4fa';
    this.ctx.stroke();
    this.ctx.restore();

    if (hasShield) {
      this.ctx.save();
      const blinkAlpha = shieldBlink > 0 ? (Math.floor(shieldBlink / 4) % 2 === 0 ? 0.2 : 0) : 0.2;
      this.ctx.globalAlpha = blinkAlpha;
      this.ctx.strokeStyle = '#00e5ff';
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = '#00e5ff';
      this.ctx.shadowBlur = 15;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 50, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  drawBullet(x: number, y: number, upgraded: boolean): void {
    const w = upgraded ? 8 : 4;
    const h = 12;
    this.ctx.save();
    this.ctx.shadowColor = '#ffeb3b';
    this.ctx.shadowBlur = 8;
    this.ctx.fillStyle = '#ffeb3b';
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawBulletTrail(x: number, y: number, upgraded: boolean): void {
    const w = upgraded ? 8 : 4;
    this.addParticle({
      x,
      y: y + 6,
      vx: (Math.random() - 0.5) * 0.5,
      vy: Math.random() * 2,
      life: 15,
      maxLife: 15,
      color: '#ffeb3b',
      size: w * 0.4,
    });
  }

  drawAsteroid(
    x: number,
    y: number,
    radius: number,
    vertices: { x: number; y: number }[],
    flashTime: number
  ): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, '#6d4c41');
    gradient.addColorStop(1, '#3e2723');
    this.ctx.fillStyle = flashTime > 0 ? '#ff1744' : gradient;
    this.ctx.beginPath();
    this.ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      this.ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.strokeStyle = '#8d6e63';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawOre(x: number, y: number): void {
    this.ctx.save();
    this.ctx.shadowColor = '#ffd700';
    this.ctx.shadowBlur = 10;
    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - 4.5, y - 4.5, 9, 9);
    this.ctx.fillStyle = '#ffd700';
    this.ctx.fillRect(x - 4, y - 4, 8, 8);
    this.ctx.restore();
  }

  addParticle(p: Particle): void {
    this.particles.push(p);
  }

  addShockWave(x: number, y: number): void {
    this.shockWaves.push({ x, y, radius: 0, maxRadius: 50, alpha: 0.5, life: 12 });
  }

  addUpgradeText(text: string): void {
    this.upgradeTexts.push({ text, life: 90, maxLife: 90 });
  }

  triggerFlash(): void {
    this.flashEffect = { alpha: 0.6, life: 18 };
  }

  spawnExplosion(x: number, y: number): void {
    const colors = ['#4fc3f7', '#81d4fa', '#ffeb3b', '#ff4081', '#00e5ff', '#ffd700', '#ffffff', '#e91e63'];
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 2 + Math.random() * 3;
      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30,
        maxLife: 30,
        color: colors[i % colors.length],
        size: 3 + Math.random() * 2,
      });
    }
  }

  updateAndDrawEffects(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      const alpha = p.life / p.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 5;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    for (let i = this.shockWaves.length - 1; i >= 0; i--) {
      const sw = this.shockWaves[i];
      sw.life--;
      const t = 1 - sw.life / 12;
      sw.radius = sw.maxRadius * t;
      sw.alpha = 0.5 * (1 - t);
      if (sw.life <= 0) {
        this.shockWaves.splice(i, 1);
        continue;
      }
      this.ctx.save();
      this.ctx.globalAlpha = sw.alpha;
      this.ctx.strokeStyle = '#ff1744';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }

    for (let i = this.upgradeTexts.length - 1; i >= 0; i--) {
      const ut = this.upgradeTexts[i];
      ut.life--;
      if (ut.life <= 0) {
        this.upgradeTexts.splice(i, 1);
        continue;
      }
      let alpha: number;
      const t = 1 - ut.life / ut.maxLife;
      if (t < 0.2) {
        alpha = t / 0.2;
      } else if (t > 0.8) {
        alpha = (1 - t) / 0.2;
      } else {
        alpha = 1;
      }
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.font = 'bold 36px monospace';
      this.ctx.fillStyle = '#ff4081';
      this.ctx.shadowColor = '#ff4081';
      this.ctx.shadowBlur = 20;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(ut.text, this.width / 2, this.height / 2);
      this.ctx.restore();
    }

    if (this.flashEffect) {
      this.flashEffect.life--;
      this.flashEffect.alpha = 0.6 * (this.flashEffect.life / 18);
      if (this.flashEffect.life <= 0) {
        this.flashEffect = null;
      } else {
        this.ctx.save();
        this.ctx.globalAlpha = this.flashEffect.alpha;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.restore();
      }
    }

    if (this.particles.length > 500) {
      const removeCount = Math.ceil(this.particles.length * 0.1);
      this.particles.splice(0, removeCount);
    }
  }
}
