const NEBULA_COLORS = [
  '#ff6b9d',
  '#4fc3f7',
  '#ce93d8',
  '#ffd54f',
  '#81c784',
  '#e0e0e0',
];

const PARTICLE_COUNT = 300;
const HIGHLIGHT_COLOR = '#ffd700';

export interface Particle {
  id: number;
  char: string;
  baseAngle: number;
  baseRadius: number;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  color: string;
  radius: number;
  rotationSpeed: number;
  baseAlpha: number;
  isSelected: boolean;
  isDragging: boolean;
  isInSlot: boolean;
  burstDx: number;
  burstDy: number;
  burstDecay: number;
}

export interface FountainParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  radius: number;
}

interface MouseState {
  x: number;
  y: number;
  isDown: boolean;
  isInside: boolean;
}

export class StarField {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private fountainParticles: FountainParticle[] = [];
  private mouse: MouseState = { x: 0, y: 0, isDown: false, isInside: false };
  private width = 0;
  private height = 0;
  private centerX = 0;
  private centerY = 0;
  private dpr = 1;
  private charPool: string[] = [];
  private selectedParticle: Particle | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private onParticleClick?: (particle: Particle) => void;
  private onParticleDragEnd?: (particle: Particle, x: number, y: number) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  setCharPool(chars: string[]): void {
    this.charPool = chars;
  }

  setCallbacks(callbacks: {
    onParticleClick?: (particle: Particle) => void;
    onParticleDragEnd?: (particle: Particle, x: number, y: number) => void;
  }): void {
    this.onParticleClick = callbacks.onParticleClick;
    this.onParticleDragEnd = callbacks.onParticleDragEnd;
  }

  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.centerX = this.width / 2;
    this.centerY = this.height / 2 - 40;
  }

  initParticles(charPool: string[]): void {
    this.charPool = charPool;
    this.particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push(this.createParticle(i));
    }
  }

  private createParticle(id: number): Particle {
    const angle = Math.random() * Math.PI * 2;
    const maxRadius = Math.min(this.width, this.height) * 0.38;
    const minRadius = Math.min(this.width, this.height) * 0.08;
    const baseRadius = minRadius + Math.pow(Math.random(), 0.6) * (maxRadius - minRadius);
    const char = this.charPool[id % this.charPool.length];

    return {
      id,
      char,
      baseAngle: angle,
      baseRadius,
      currentX: this.centerX + Math.cos(angle) * baseRadius,
      currentY: this.centerY + Math.sin(angle) * baseRadius,
      targetX: 0,
      targetY: 0,
      color: NEBULA_COLORS[Math.floor(Math.random() * NEBULA_COLORS.length)],
      radius: 2 + Math.random() * 3,
      rotationSpeed: (0.2 + Math.random() * 0.3) * (Math.PI * 2) / 60 / 60,
      baseAlpha: 0.6 + Math.random() * 0.4,
      isSelected: false,
      isDragging: false,
      isInSlot: false,
      burstDx: 0,
      burstDy: 0,
      burstDecay: 0,
    };
  }

  triggerBurst(clickX: number, clickY: number): void {
    const burstRadius = 60;
    for (const p of this.particles) {
      if (p.isInSlot) continue;
      const dx = p.currentX - clickX;
      const dy = p.currentY - clickY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < burstRadius) {
        const force = (1 - dist / burstRadius) * 80;
        const angle = Math.atan2(dy, dx);
        p.burstDx = Math.cos(angle) * force;
        p.burstDy = Math.sin(angle) * force;
        p.burstDecay = 1;
      }
    }
  }

  spawnFountain(centerX: number, centerY: number): void {
    const colors = [...NEBULA_COLORS, HIGHLIGHT_COLOR];
    for (let i = 0; i < 120; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      this.fountainParticles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 2,
        maxLife: 2,
        radius: 1.5 + Math.random() * 3,
      });
    }
  }

  handleMouseMove(x: number, y: number): void {
    this.mouse.x = x;
    this.mouse.y = y;
    this.mouse.isInside = true;

    if (this.selectedParticle && this.selectedParticle.isDragging) {
      this.selectedParticle.currentX = x - this.dragOffsetX;
      this.selectedParticle.currentY = y - this.dragOffsetY;
    }
  }

  handleMouseLeave(): void {
    this.mouse.isInside = false;
  }

  handleMouseDown(x: number, y: number): void {
    this.mouse.x = x;
    this.mouse.y = y;
    this.mouse.isDown = true;

    const particle = this.findParticleAt(x, y);
    if (particle && !particle.isInSlot) {
      this.selectParticle(particle, x, y);
    }
  }

  handleMouseUp(x: number, y: number): void {
    this.mouse.isDown = false;

    if (this.selectedParticle && this.selectedParticle.isDragging) {
      this.selectedParticle.isDragging = false;
      if (this.onParticleDragEnd) {
        this.onParticleDragEnd(this.selectedParticle, x, y);
      }
    }

    if (!this.selectedParticle) {
      this.triggerBurst(x, y);
    }
  }

  private findParticleAt(x: number, y: number): Particle | null {
    let closest: Particle | null = null;
    let closestDist = Infinity;

    for (const p of this.particles) {
      if (p.isInSlot) continue;
      const dx = p.currentX - x;
      const dy = p.currentY - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < p.radius + 12 && dist < closestDist) {
        closest = p;
        closestDist = dist;
      }
    }

    return closest;
  }

  private selectParticle(particle: Particle, clickX: number, clickY: number): void {
    if (this.selectedParticle && this.selectedParticle !== particle) {
      this.selectedParticle.isSelected = false;
      this.selectedParticle.isDragging = false;
    }

    this.selectedParticle = particle;
    particle.isSelected = true;
    particle.isDragging = true;
    this.dragOffsetX = clickX - particle.currentX;
    this.dragOffsetY = clickY - particle.currentY;

    if (this.onParticleClick) {
      this.onParticleClick(particle);
    }
  }

  deselectAll(): void {
    for (const p of this.particles) {
      p.isSelected = false;
      p.isDragging = false;
    }
    this.selectedParticle = null;
  }

  markParticleInSlot(particleId: number): void {
    const p = this.particles.find(pt => pt.id === particleId);
    if (p) {
      p.isInSlot = true;
      p.isSelected = false;
      p.isDragging = false;
    }
    if (this.selectedParticle?.id === particleId) {
      this.selectedParticle = null;
    }
  }

  returnParticleToField(particleId: number): void {
    const p = this.particles.find(pt => pt.id === particleId);
    if (p) {
      p.isInSlot = false;
    }
  }

  reset(): void {
    for (const p of this.particles) {
      p.isInSlot = false;
      p.isSelected = false;
      p.isDragging = false;
      p.burstDx = 0;
      p.burstDy = 0;
      p.burstDecay = 0;
    }
    this.selectedParticle = null;
    this.fountainParticles = [];
  }

  update(dt: number): void {
    for (const p of this.particles) {
      if (p.isInSlot) continue;
      if (p.isDragging) continue;

      p.baseAngle += p.rotationSpeed * dt * 60;

      const baseX = this.centerX + Math.cos(p.baseAngle) * p.baseRadius;
      const baseY = this.centerY + Math.sin(p.baseAngle) * p.baseRadius;

      let attractX = baseX;
      let attractY = baseY;

      if (this.mouse.isInside) {
        const dx = this.mouse.x - baseX;
        const dy = this.mouse.y - baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxInfluence = 200;
        if (dist < maxInfluence && dist > 0.1) {
          const strength = (1 - dist / maxInfluence) * 0.2;
          attractX = baseX + dx * strength;
          attractY = baseY + dy * strength;
        }
      }

      if (p.burstDecay > 0) {
        p.burstDx *= 0.92;
        p.burstDy *= 0.92;
        p.burstDecay -= dt * 1.5;
        if (p.burstDecay < 0) p.burstDecay = 0;
      }

      p.targetX = attractX + p.burstDx;
      p.targetY = attractY + p.burstDy;

      p.currentX += (p.targetX - p.currentX) * Math.min(1, dt * 6);
      p.currentY += (p.targetY - p.currentY) * Math.min(1, dt * 6);
    }

    const gravity = 80;
    for (let i = this.fountainParticles.length - 1; i >= 0; i--) {
      const fp = this.fountainParticles[i];
      fp.vy += gravity * dt;
      fp.x += fp.vx * dt;
      fp.y += fp.vy * dt;
      fp.vx *= 0.98;
      fp.vy *= 0.98;
      fp.life -= dt;

      if (fp.life <= 0) {
        this.fountainParticles.splice(i, 1);
      }
    }
  }

  render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.renderFountain();
    this.renderParticles();
  }

  private renderParticles(): void {
    for (const p of this.particles) {
      if (p.isInSlot) continue;
      this.renderSingleParticle(p);
    }
  }

  private renderSingleParticle(p: Particle): void {
    const color = p.isSelected ? HIGHLIGHT_COLOR : p.color;
    const alpha = p.isSelected ? 1 : p.baseAlpha;
    const glowRadius = p.isSelected ? p.radius * 6 : p.radius * 3.5;
    const drawRadius = p.isSelected ? p.radius * 1.4 : p.radius;

    const gradient = this.ctx.createRadialGradient(
      p.currentX, p.currentY, 0,
      p.currentX, p.currentY, glowRadius
    );
    gradient.addColorStop(0, this.hexToRgba(color, alpha));
    gradient.addColorStop(0.4, this.hexToRgba(color, alpha * 0.4));
    gradient.addColorStop(1, this.hexToRgba(color, 0));

    this.ctx.beginPath();
    this.ctx.arc(p.currentX, p.currentY, glowRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(p.currentX, p.currentY, drawRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = this.hexToRgba(color, alpha);
    this.ctx.fill();

    if (p.isSelected) {
      this.ctx.font = `bold ${Math.floor(drawRadius * 2.8)}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowColor = HIGHLIGHT_COLOR;
      this.ctx.shadowBlur = 12;
      this.ctx.fillText(p.char, p.currentX, p.currentY - drawRadius * 2.2);
      this.ctx.shadowBlur = 0;
    }
  }

  private renderFountain(): void {
    for (const fp of this.fountainParticles) {
      const alpha = fp.life / fp.maxLife;
      const glow = fp.radius * 4;

      const gradient = this.ctx.createRadialGradient(
        fp.x, fp.y, 0,
        fp.x, fp.y, glow
      );
      gradient.addColorStop(0, this.hexToRgba(fp.color, alpha));
      gradient.addColorStop(0.3, this.hexToRgba(fp.color, alpha * 0.5));
      gradient.addColorStop(1, this.hexToRgba(fp.color, 0));

      this.ctx.beginPath();
      this.ctx.arc(fp.x, fp.y, glow, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(fp.x, fp.y, fp.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = this.hexToRgba(fp.color, alpha);
      this.ctx.fill();
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  getCenter(): { x: number; y: number } {
    return { x: this.centerX, y: this.centerY };
  }

  getParticleById(id: number): Particle | undefined {
    return this.particles.find(p => p.id === id);
  }
}
