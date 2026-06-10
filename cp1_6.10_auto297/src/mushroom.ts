const PARTICLE_COUNT = 30;
const PARTICLE_LIFE = 1.5;
const ATTRACT_DURATION = 4;
const MUSHROOM_RADIUS = 12;
const GLOW_RADIUS = 30;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
}

export class Mushroom {
  x: number;
  y: number;
  spawnTime: number;
  isClicked: boolean;
  particles: Particle[];
  attractFireflies: boolean;
  attractEndTime: number;
  clickTime: number;

  constructor(canvasWidth: number, canvasHeight: number, currentTime: number) {
    this.x = 60 + Math.random() * (canvasWidth - 120);
    this.y = 60 + Math.random() * (canvasHeight - 120);
    this.spawnTime = currentTime;
    this.isClicked = false;
    this.particles = [];
    this.attractFireflies = false;
    this.attractEndTime = 0;
    this.clickTime = 0;
  }

  triggerClick(currentTime: number) {
    if (this.isClicked) return;
    this.isClicked = true;
    this.clickTime = currentTime;
    this.attractFireflies = true;
    this.attractEndTime = currentTime + ATTRACT_DURATION;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.3;
      const speed = 80 + Math.random() * 40;
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 2,
        life: PARTICLE_LIFE,
        maxLife: PARTICLE_LIFE
      });
    }
  }

  update(dt: number, currentTime: number) {
    if (this.attractFireflies && currentTime >= this.attractEndTime) {
      this.attractFireflies = false;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
  }

  isExpired(currentTime: number): boolean {
    return this.isClicked && this.particles.length === 0 && !this.attractFireflies;
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= MUSHROOM_RADIUS + 5;
  }

  getAttractPoint(): { x: number; y: number } | null {
    return this.attractFireflies ? { x: this.x, y: this.y } : null;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.isClicked || this.attractFireflies) {
      const glowGradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, GLOW_RADIUS);
      glowGradient.addColorStop(0, 'rgba(0, 230, 118, 0.3)');
      glowGradient.addColorStop(1, 'rgba(0, 230, 118, 0)');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, GLOW_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!this.isClicked || this.attractFireflies) {
      ctx.strokeStyle = '#a5d6a7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x, this.y + 10);
      ctx.stroke();

      const capGradient = ctx.createRadialGradient(
        this.x, this.y - 2, 0,
        this.x, this.y - 2, MUSHROOM_RADIUS
      );
      capGradient.addColorStop(0, 'rgba(118, 255, 3, 0.9)');
      capGradient.addColorStop(1, 'rgba(0, 230, 118, 0.7)');
      ctx.fillStyle = capGradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y - 2, MUSHROOM_RADIUS, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
    }

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      const currentSize = p.size * alpha;
      const colorMix = alpha;
      const r = Math.floor(255);
      const g = Math.floor(234 * colorMix + 241 * (1 - colorMix));
      const b = Math.floor(0 * colorMix + 118 * (1 - colorMix));

      const pGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize * 2);
      pGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
      pGlow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = pGlow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, currentSize * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
