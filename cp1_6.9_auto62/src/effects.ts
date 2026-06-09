import type { AuroraBand } from './aurora';

export interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  pulseSpeed: number;
  pulsePhase: number;
  lifeTime: number;
  totalLife: number;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  opacity: number;
  lifeTime: number;
  totalTime: number;
}

export interface MouseCallbacks {
  onMove: (offsetX: number, canvasWidth: number) => void;
  onClick: (x: number, y: number) => void;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 255, b: 136 };
}

export class EffectsManager {
  stars: Star[] = [];
  ripples: Ripple[] = [];
  canvas: HTMLCanvasElement;
  private starSpawnTimer: number = 0;
  private maxStars: number = 30;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  bindMouseEvents(callbacks: MouseCallbacks): void {
    const canvas = this.canvas;

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const centerX = rect.width / 2;
      const offset = (x - centerX) * 0.1;
      callbacks.onMove(offset, rect.width);
    });

    canvas.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const centerX = rect.width / 2;
        const offset = (x - centerX) * 0.1;
        callbacks.onMove(offset, rect.width);
      }
    }, { passive: true });

    canvas.addEventListener('click', (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      callbacks.onClick(x, y);
    });

    canvas.addEventListener('touchend', (e: TouchEvent) => {
      if (e.changedTouches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.changedTouches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        callbacks.onClick(x, y);
      }
    });
  }

  addRipple(x: number, y: number, color: string): void {
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: 400,
      color,
      opacity: 0.8,
      lifeTime: 1.5,
      totalTime: 1.5
    });
  }

  private spawnStar(auroraBands: AuroraBand[]): void {
    if (this.stars.length >= this.maxStars || auroraBands.length === 0) return;

    const band = auroraBands[Math.floor(Math.random() * auroraBands.length)];
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    const x = Math.random() * canvasWidth;
    const normalizedX = x / canvasWidth;
    const wave = Math.sin(normalizedX * Math.PI * 2 * band.frequency + band.phase) * band.amplitude;
    const bandY = band.baseY + wave;

    const offsetY = (Math.random() - 0.5) * Math.max(band.width * 2, 100);

    this.stars.push({
      x: x + (Math.random() - 0.5) * 50,
      y: Math.max(10, Math.min(canvasHeight - 10, bandY + offsetY)),
      size: 2 + Math.random() * 2,
      opacity: 0.3,
      pulseSpeed: 1 + Math.random() * 2,
      pulsePhase: Math.random() * Math.PI * 2,
      lifeTime: 0.5 + Math.random() * 1.5,
      totalLife: 0.5 + Math.random() * 1.5
    });
  }

  update(deltaTime: number, auroraBands: AuroraBand[]): void {
    this.starSpawnTimer -= deltaTime;
    if (this.starSpawnTimer <= 0) {
      this.spawnStar(auroraBands);
      this.starSpawnTimer = 0.3 + Math.random() * 0.5;
    }

    for (let i = this.stars.length - 1; i >= 0; i--) {
      const star = this.stars[i];
      star.lifeTime -= deltaTime;
      star.pulsePhase += star.pulseSpeed * deltaTime * Math.PI * 2;

      const lifeRatio = star.lifeTime / star.totalLife;
      const pulse = 0.5 + 0.5 * Math.sin(star.pulsePhase);
      star.opacity = (0.3 + 0.7 * pulse) * Math.min(1, lifeRatio * 3);

      if (star.lifeTime <= 0) {
        this.stars.splice(i, 1);
      }
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      ripple.lifeTime -= deltaTime;

      const progress = 1 - ripple.lifeTime / ripple.totalTime;
      ripple.radius = ripple.maxRadius * progress;
      ripple.opacity = 0.8 * (1 - progress);

      if (ripple.lifeTime <= 0) {
        this.ripples.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.globalCompositeOperation = 'lighter';

    for (const star of this.stars) {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      ctx.fill();

      if (star.size > 2.5) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * 0.2})`;
        ctx.fill();
      }
    }

    for (const ripple of this.ripples) {
      const rgb = hexToRgb(ripple.color);

      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${ripple.opacity})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${ripple.opacity * 0.5})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius * 0.4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${ripple.opacity * 0.3})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
  }
}
