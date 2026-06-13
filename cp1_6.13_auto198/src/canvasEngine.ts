export type PatternType = 'circle' | 'star' | 'heart' | 'butterfly' | 'spiral';

export interface FireworkRecipe {
  id?: string;
  name: string;
  color: string;
  pattern: PatternType;
  launchDuration: number;
  pitch: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  trail: { x: number; y: number }[];
}

interface LaunchingFirework {
  x: number;
  startY: number;
  peakY: number;
  progress: number;
  duration: number;
  recipe: FireworkRecipe;
  exploded: boolean;
}

export interface EventBus {
  on(event: string, callback: (data: any) => void): void;
  emit(event: string, data: any): void;
  off(event: string, callback: (data: any) => void): void;
}

class SimpleEventBus implements EventBus {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  emit(event: string, data: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(cb => cb(data));
    }
  }

  off(event: string, callback: (data: any) => void): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }
}

export const eventBus: EventBus = new SimpleEventBus();

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private launchingFireworks: LaunchingFirework[] = [];
  private animationId: number | null = null;
  private lastTime: number = 0;
  private bgParticles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[] = [];
  private glowRadius: number = 100;
  private glowDirection: number = 1;
  private centerX: number = 0;
  private centerY: number = 0;
  private isRunning: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.initBgParticles();
    this.resize();
  }

  private initBgParticles(): void {
    this.bgParticles = [];
    for (let i = 0; i < 100; i++) {
      this.bgParticles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: 1 + Math.random() * 2,
        alpha: 0.05 + Math.random() * 0.05
      });
    }
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.centerX = rect.width / 2;
    this.centerY = rect.height / 2;
    this.initBgParticles();
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animate();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate = (): void => {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(this.animate);
  };

  private update(deltaTime: number): void {
    this.glowRadius += this.glowDirection * 10 * deltaTime;
    if (this.glowRadius >= 120) {
      this.glowRadius = 120;
      this.glowDirection = -1;
    } else if (this.glowRadius <= 100) {
      this.glowRadius = 100;
      this.glowDirection = 1;
    }

    this.bgParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = this.canvas.width / window.devicePixelRatio;
      if (p.x > this.canvas.width / window.devicePixelRatio) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height / window.devicePixelRatio;
      if (p.y > this.canvas.height / window.devicePixelRatio) p.y = 0;
    });

    this.launchingFireworks = this.launchingFireworks.filter(fw => {
      fw.progress += deltaTime / fw.duration;
      if (fw.progress >= 1 && !fw.exploded) {
        fw.exploded = true;
        this.createExplosion(fw.x, fw.peakY, fw.recipe);
        eventBus.emit('firework:exploded', { recipe: fw.recipe });
        return false;
      }
      return !fw.exploded;
    });

    this.particles = this.particles.filter(p => {
      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > 5) p.trail.pop();

      p.x += p.vx * deltaTime * 60;
      p.y += p.vy * deltaTime * 60;
      p.vy += 0.1 * deltaTime * 60;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= deltaTime;
      return p.life > 0;
    });
  }

  private render(): void {
    const ctx = this.ctx;
    const width = this.canvas.width / window.devicePixelRatio;
    const height = this.canvas.height / window.devicePixelRatio;

    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, Math.max(width, height) * 0.7
    );
    gradient.addColorStop(0, '#1a0e30');
    gradient.addColorStop(1, '#0b0f24');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    this.renderBgParticles();
    this.renderWorkshop();
    this.renderLaunchingFireworks();
    this.renderParticles();
  }

  private renderBgParticles(): void {
    const ctx = this.ctx;
    this.bgParticles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
      ctx.fill();
    });
  }

  private renderWorkshop(): void {
    const ctx = this.ctx;
    const cx = this.centerX;
    const cy = this.centerY;

    const glowGradient = ctx.createRadialGradient(cx, cy, this.glowRadius * 0.5, cx, cy, this.glowRadius);
    glowGradient.addColorStop(0, 'rgba(212, 163, 115, 0.5)');
    glowGradient.addColorStop(1, 'rgba(212, 163, 115, 0)');
    ctx.beginPath();
    ctx.arc(cx, cy, this.glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();

    const platformRadius = 75;
    const platformGradient = ctx.createRadialGradient(cx, cy - 5, 0, cx, cy, platformRadius);
    platformGradient.addColorStop(0, '#8B7355');
    platformGradient.addColorStop(0.5, '#6B5344');
    platformGradient.addColorStop(1, '#4a3728');
    
    ctx.beginPath();
    ctx.ellipse(cx, cy, platformRadius, platformRadius * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = platformGradient;
    ctx.fill();
    ctx.strokeStyle = '#3d2817';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(60, 40, 20, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      const x = cx + Math.cos(angle) * platformRadius;
      const y = cy + Math.sin(angle) * platformRadius * 0.3;
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    const tubeCount = 12;
    const tubeRadius = 12.5;
    const tubeHeight = 30;
    const orbitRadius = 100;

    for (let i = 0; i < tubeCount; i++) {
      const angle = (i / tubeCount) * Math.PI * 2 - Math.PI / 2;
      const tx = cx + Math.cos(angle) * orbitRadius;
      const ty = cy + Math.sin(angle) * orbitRadius * 0.3;

      const tubeGradient = ctx.createLinearGradient(tx - tubeRadius, ty, tx + tubeRadius, ty);
      tubeGradient.addColorStop(0, '#5a4a3a');
      tubeGradient.addColorStop(0.5, '#7a6a5a');
      tubeGradient.addColorStop(1, '#4a3a2a');

      ctx.fillStyle = tubeGradient;
      ctx.fillRect(tx - tubeRadius, ty - tubeHeight, tubeRadius * 2, tubeHeight);

      ctx.beginPath();
      ctx.ellipse(tx, ty - tubeHeight, tubeRadius, tubeRadius * 0.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#2a1a0a';
      ctx.fill();
      ctx.strokeStyle = '#d4a373';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.shadowColor = '#d4a373';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#d4a373';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(tx, ty - tubeHeight, tubeRadius, tubeRadius * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      for (let j = 1; j < 3; j++) {
        const yPos = ty - tubeHeight * (j / 3);
        ctx.beginPath();
        ctx.moveTo(tx - tubeRadius, yPos);
        ctx.lineTo(tx + tubeRadius, yPos);
        ctx.stroke();
      }
    }
  }

  private renderLaunchingFireworks(): void {
    const ctx = this.ctx;

    this.launchingFireworks.forEach(fw => {
      const t = fw.progress;
      const y = fw.startY + (fw.peakY - fw.startY) * (1 - Math.pow(1 - t, 2));
      const x = fw.x;

      const trailGradient = ctx.createLinearGradient(x, fw.startY, x, y);
      trailGradient.addColorStop(0, 'rgba(255, 200, 100, 0)');
      trailGradient.addColorStop(1, fw.recipe.color);
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, Math.min(y + 30, fw.startY));
      ctx.strokeStyle = trailGradient;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = fw.recipe.color;
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  private renderParticles(): void {
    const ctx = this.ctx;

    this.particles.forEach(p => {
      const lifeRatio = p.life / p.maxLife;
      const currentSize = p.size * lifeRatio;

      for (let i = p.trail.length - 1; i >= 0; i--) {
        const trail = p.trail[i];
        const trailAlpha = (1 - i / p.trail.length) * lifeRatio * 0.5;
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, currentSize * (1 - i / p.trail.length), 0, Math.PI * 2);
        ctx.fillStyle = this.colorWithAlpha(p.color, trailAlpha);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
      ctx.fillStyle = this.colorWithAlpha(p.color, lifeRatio);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  private colorWithAlpha(color: string, alpha: number): string {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  }

  private createExplosion(x: number, y: number, recipe: FireworkRecipe): void {
    const particleCount = 50 + Math.floor(Math.random() * 31);
    const maxLife = 0.6;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      let speed = 2 + Math.random() * 2;
      
      switch (recipe.pattern) {
        case 'circle':
          speed = 2.5 + Math.random() * 1.5;
          break;
        case 'star':
          const starPoints = 5;
          const starAngle = (i % (particleCount / starPoints)) / (particleCount / starPoints) * Math.PI * 2;
          const starPhase = Math.floor(i / (particleCount / starPoints));
          const starRadius = starPhase % 2 === 0 ? 3 : 1.5;
          speed = starRadius + Math.random() * 0.5;
          break;
        case 'heart':
          const t = (i / particleCount) * Math.PI * 2;
          const heartX = 16 * Math.pow(Math.sin(t), 3);
          const heartY = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          const heartAngle = Math.atan2(heartY, heartX);
          const heartMag = Math.sqrt(heartX * heartX + heartY * heartY) / 10;
          speed = heartMag * 2 + Math.random() * 0.5;
          break;
        case 'butterfly':
          const bfAngle = (i / particleCount) * Math.PI * 2;
          const bfR = Math.cos(2 * bfAngle) * 2.5 + Math.random() * 0.5;
          speed = Math.abs(bfR) + 1;
          break;
        case 'spiral':
          const spiralProgress = i / particleCount;
          const spiralAngle = spiralProgress * Math.PI * 4;
          const spiralR = spiralProgress * 3 + 0.5;
          const dx = Math.cos(spiralAngle) * spiralR;
          const dy = Math.sin(spiralAngle) * spiralR;
          const spAngle = Math.atan2(dy, dx);
          const spMag = Math.sqrt(dx * dx + dy * dy);
          speed = spMag + Math.random() * 0.3;
          break;
      }

      const particle: Particle = {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxLife,
        maxLife,
        size: 8,
        color: recipe.color,
        trail: []
      };

      this.particles.push(particle);
    }
  }

  launchFirework(tubeIndex: number, recipe: FireworkRecipe): void {
    const tubeCount = 12;
    const orbitRadius = 100;
    const angle = (tubeIndex / tubeCount) * Math.PI * 2 - Math.PI / 2;
    
    const startX = this.centerX + Math.cos(angle) * orbitRadius;
    const startY = this.centerY + Math.sin(angle) * orbitRadius * 0.3 - 30;
    const peakY = startY - 150 - Math.random() * 50;

    const fw: LaunchingFirework = {
      x: startX,
      startY,
      peakY,
      progress: 0,
      duration: recipe.launchDuration,
      recipe,
      exploded: false
    };

    this.launchingFireworks.push(fw);
  }

  generateThumbnail(recipe: FireworkRecipe, size: number = 60): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const particleCount = 30;
    const maxRadius = size * 0.4;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      let r = maxRadius * 0.6;

      switch (recipe.pattern) {
        case 'circle':
          r = maxRadius * (0.7 + Math.random() * 0.3);
          break;
        case 'star':
          const starPoints = 5;
          const starIndex = i % starPoints;
          const isOuter = Math.floor(i / (particleCount / starPoints)) % 2 === 0;
          r = maxRadius * (isOuter ? 0.85 : 0.4);
          break;
        case 'heart':
          const t = (i / particleCount) * Math.PI * 2;
          const hx = 16 * Math.pow(Math.sin(t), 3);
          const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          r = Math.sqrt(hx * hx + hy * hy) / 20 * maxRadius;
          break;
        case 'butterfly':
          r = Math.abs(Math.cos(2 * angle)) * maxRadius * 0.7 + maxRadius * 0.2;
          break;
        case 'spiral':
          const progress = i / particleCount;
          r = progress * maxRadius * 0.9;
          const spiralAngle = progress * Math.PI * 4;
          const px = Math.cos(spiralAngle) * r;
          const py = Math.sin(spiralAngle) * r;
          ctx.beginPath();
          ctx.arc(cx + px, cy + py, 2, 0, Math.PI * 2);
          ctx.fillStyle = recipe.color;
          ctx.fill();
          continue;
      }

      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;

      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = recipe.color;
      ctx.shadowColor = recipe.color;
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    return canvas;
  }

  getTubeIndexAtPosition(x: number, y: number): number | null {
    const tubeCount = 12;
    const orbitRadius = 100;
    const tubeRadius = 15;

    for (let i = 0; i < tubeCount; i++) {
      const angle = (i / tubeCount) * Math.PI * 2 - Math.PI / 2;
      const tx = this.centerX + Math.cos(angle) * orbitRadius;
      const ty = this.centerY + Math.sin(angle) * orbitRadius * 0.3 - 15;

      const dx = x - tx;
      const dy = y - ty;
      if (dx * dx + dy * dy < tubeRadius * tubeRadius) {
        return i;
      }
    }
    return null;
  }

  getCenter(): { x: number; y: number } {
    return { x: this.centerX, y: this.centerY };
  }
}
