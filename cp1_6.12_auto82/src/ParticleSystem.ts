import { Painting, hexToRgb, lerpColor, rgbToString } from './ArtData';

export interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  targetSize: number;
  color: { r: number; g: number; b: number };
  targetColor: { r: number; g: number; b: number };
  colorIndex: number;
  driftAngle: number;
  driftSpeed: number;
  trail: { x: number; y: number; alpha: number }[];
  maxTrailLength: number;
}

export interface InteractionState {
  isDragging: boolean;
  mouseX: number;
  mouseY: number;
  prevMouseX: number;
  prevMouseY: number;
  mouseVx: number;
  mouseVy: number;
  releaseProgress: number;
}

export interface TransitionState {
  active: boolean;
  progress: number;
  duration: number;
  type: 'switch' | 'reset';
}

const PARTICLE_COUNT = 600;
const MIN_SIZE = 2;
const MAX_SIZE = 12;
const DRIFT_MIN = 0.1;
const DRIFT_MAX = 0.5;
const MOUSE_INFLUENCE_RADIUS = 150;
const TRAIL_LENGTH = 30;
const RELEASE_DURATION = 2000;
const SWITCH_DURATION = 1500;
const RESET_DURATION = 1000;

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export class ParticleSystem {
  private particles: Particle[] = [];
  private width: number = 0;
  private height: number = 0;
  private currentPainting!: Painting;
  private interaction: InteractionState = {
    isDragging: false,
    mouseX: 0,
    mouseY: 0,
    prevMouseX: 0,
    prevMouseY: 0,
    mouseVx: 0,
    mouseVy: 0,
    releaseProgress: 1
  };
  private transition: TransitionState = {
    active: false,
    progress: 0,
    duration: 0,
    type: 'switch'
  };
  private transitionStartPositions: { x: number; y: number }[] = [];
  private transitionStartSizes: number[] = [];
  private transitionStartColors: { r: number; g: number; b: number }[] = [];
  private targetPositions: { x: number; y: number }[] = [];

  getParticles(): Particle[] {
    return this.particles;
  }

  getPainting(): Painting {
    return this.currentPainting;
  }

  init(width: number, height: number, painting: Painting): void {
    this.width = width;
    this.height = height;
    this.currentPainting = painting;
    this.particles = [];
    this.generateInitialParticles();
  }

  resize(width: number, height: number): void {
    const oldW = this.width;
    const oldH = this.height;
    this.width = width;
    this.height = height;

    if (oldW > 0 && oldH > 0) {
      const scaleX = width / oldW;
      const scaleY = height / oldH;
      for (const p of this.particles) {
        p.x *= scaleX;
        p.y *= scaleY;
        p.originX *= scaleX;
        p.originY *= scaleY;
        for (const t of p.trail) {
          t.x *= scaleX;
          t.y *= scaleY;
        }
      }
    }
  }

  private generateInitialParticles(): void {
    const layout = this.currentPainting.layout;
    const colors = this.currentPainting.colors.map(c => hexToRgb(c));

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const pos = this.getLayoutPosition(layout, i);
      const colorIndex = i % colors.length;
      const color = colors[colorIndex];
      const size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);

      this.particles.push({
        x: pos.x,
        y: pos.y,
        originX: pos.x,
        originY: pos.y,
        vx: 0,
        vy: 0,
        size: size,
        baseSize: size,
        targetSize: size,
        color: { ...color },
        targetColor: { ...color },
        colorIndex: colorIndex,
        driftAngle: Math.random() * Math.PI * 2,
        driftSpeed: DRIFT_MIN + Math.random() * (DRIFT_MAX - DRIFT_MIN),
        trail: [],
        maxTrailLength: TRAIL_LENGTH
      });
    }
  }

  private getLayoutPosition(layout: string, index: number): { x: number; y: number } {
    const margin = Math.min(this.width, this.height) * 0.08;
    const usableW = this.width - margin * 2;
    const usableH = this.height - margin * 2;
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    switch (layout) {
      case 'radial': {
        const t = index / PARTICLE_COUNT;
        const r = Math.sqrt(t) * Math.min(usableW, usableH) * 0.45;
        const angle = index * 2.399963;
        return {
          x: centerX + Math.cos(angle) * r,
          y: centerY + Math.sin(angle) * r
        };
      }
      case 'spiral': {
        const t = index / PARTICLE_COUNT;
        const angle = t * Math.PI * 12;
        const r = t * Math.min(usableW, usableH) * 0.42;
        return {
          x: centerX + Math.cos(angle) * r,
          y: centerY + Math.sin(angle) * r
        };
      }
      case 'grid': {
        const cols = Math.ceil(Math.sqrt(PARTICLE_COUNT * (usableW / usableH)));
        const rows = Math.ceil(PARTICLE_COUNT / cols);
        const col = index % cols;
        const row = Math.floor(index / cols);
        const cellW = usableW / (cols - 1);
        const cellH = usableH / (rows - 1);
        const jitter = 0.15;
        return {
          x: margin + col * cellW + (Math.random() - 0.5) * cellW * jitter,
          y: margin + row * cellH + (Math.random() - 0.5) * cellH * jitter
        };
      }
      case 'wave': {
        const t = index / PARTICLE_COUNT;
        const rows = 6;
        const row = index % rows;
        const colT = Math.floor(index / rows) / Math.ceil(PARTICLE_COUNT / rows);
        const baseY = margin + (row + 0.5) * (usableH / rows);
        const waveAmp = usableH * 0.08;
        return {
          x: margin + colT * usableW,
          y: baseY + Math.sin(colT * Math.PI * 6 + row * 0.8) * waveAmp
        };
      }
      case 'scatter':
      default: {
        return {
          x: margin + Math.random() * usableW,
          y: margin + Math.random() * usableH
        };
      }
    }
  }

  switchPainting(newPainting: Painting): void {
    const newColors = newPainting.colors.map(c => hexToRgb(c));

    this.transitionStartPositions = this.particles.map(p => ({ x: p.x, y: p.y }));
    this.transitionStartSizes = this.particles.map(p => p.size);
    this.transitionStartColors = this.particles.map(p => ({ ...p.color }));

    this.currentPainting = newPainting;
    this.targetPositions = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const pos = this.getLayoutPosition(newPainting.layout, i);
      this.targetPositions.push(pos);
      const colorIndex = i % newColors.length;
      this.particles[i].originX = pos.x;
      this.particles[i].originY = pos.y;
      this.particles[i].targetColor = { ...newColors[colorIndex] };
      this.particles[i].targetSize = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);
      this.particles[i].colorIndex = colorIndex;
    }

    this.transition = {
      active: true,
      progress: 0,
      duration: SWITCH_DURATION,
      type: 'switch'
    };
  }

  resetToOrigin(): void {
    this.transitionStartPositions = this.particles.map(p => ({ x: p.x, y: p.y }));
    this.transitionStartSizes = this.particles.map(p => p.size);
    this.transitionStartColors = this.particles.map(p => ({ ...p.color }));

    const colors = this.currentPainting.colors.map(c => hexToRgb(c));
    this.targetPositions = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const pos = { x: this.particles[i].originX, y: this.particles[i].originY };
      this.targetPositions.push(pos);
      const colorIndex = this.particles[i].colorIndex;
      this.particles[i].targetColor = { ...colors[colorIndex] };
      this.particles[i].targetSize = this.particles[i].baseSize;
    }

    this.transition = {
      active: true,
      progress: 0,
      duration: RESET_DURATION,
      type: 'reset'
    };
  }

  setMouseDown(x: number, y: number): void {
    this.interaction.isDragging = true;
    this.interaction.mouseX = x;
    this.interaction.mouseY = y;
    this.interaction.prevMouseX = x;
    this.interaction.prevMouseY = y;
    this.interaction.mouseVx = 0;
    this.interaction.mouseVy = 0;
    this.interaction.releaseProgress = 0;
  }

  setMouseMove(x: number, y: number): void {
    this.interaction.prevMouseX = this.interaction.mouseX;
    this.interaction.prevMouseY = this.interaction.mouseY;
    this.interaction.mouseX = x;
    this.interaction.mouseY = y;

    if (this.interaction.isDragging) {
      this.interaction.mouseVx = x - this.interaction.prevMouseX;
      this.interaction.mouseVy = y - this.interaction.prevMouseY;
    }
  }

  setMouseUp(): void {
    this.interaction.isDragging = false;
    this.interaction.releaseProgress = 0;
  }

  update(deltaTime: number): void {
    if (this.transition.active) {
      this.transition.progress += deltaTime;
      const t = Math.min(this.transition.progress / this.transition.duration, 1);
      const eased = this.transition.type === 'switch' ? easeInOutCubic(t) : easeOutCubic(t);

      const angle = t * Math.PI * 2;
      const scale = 0.7 + 0.3 * Math.cos(angle);

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = this.particles[i];
        const start = this.transitionStartPositions[i];
        const target = this.targetPositions[i];
        const midX = (start.x + target.x) / 2;
        const midY = (start.y + target.y) / 2;

        const dx = target.x - start.x;
        const dy = target.y - start.y;
        const nx = -dy * 0.001;
        const ny = dx * 0.001;

        p.x = start.x + dx * eased + nx * Math.sin(t * Math.PI) * 100 * scale;
        p.y = start.y + dy * eased + ny * Math.sin(t * Math.PI) * 100 * scale;

        p.size = this.transitionStartSizes[i] + (p.targetSize - this.transitionStartSizes[i]) * eased;
        p.color = lerpColor(this.transitionStartColors[i], p.targetColor, eased);
      }

      if (t >= 1) {
        this.transition.active = false;
      }
      this.updateTrails();
      return;
    }

    if (!this.interaction.isDragging && this.interaction.releaseProgress < 1) {
      this.interaction.releaseProgress = Math.min(
        this.interaction.releaseProgress + deltaTime / RELEASE_DURATION,
        1
      );
    }

    const releaseFactor = easeOutCubic(this.interaction.releaseProgress);
    const mouseFactor = this.interaction.isDragging ? 1 : 1 - releaseFactor;

    for (const p of this.particles) {
      if (this.interaction.isDragging || mouseFactor > 0.01) {
        const dx = this.interaction.mouseX - p.x;
        const dy = this.interaction.mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MOUSE_INFLUENCE_RADIUS && dist > 0) {
          const strength = (1 - dist / MOUSE_INFLUENCE_RADIUS) * mouseFactor;
          const velocityMag = Math.sqrt(
            this.interaction.mouseVx * this.interaction.mouseVx +
            this.interaction.mouseVy * this.interaction.mouseVy
          );
          const maxSpeed = 15;
          const speedFactor = Math.min(velocityMag / 5, 3);

          p.vx += this.interaction.mouseVx * strength * 0.5 * speedFactor;
          p.vy += this.interaction.mouseVy * strength * 0.5 * speedFactor;

          if (dist < 30) {
            const push = (30 - dist) / 30 * strength * maxSpeed * 0.3;
            p.vx -= (dx / dist) * push;
            p.vy -= (dy / dist) * push;
          }
        }
      }

      p.driftAngle += (Math.random() - 0.5) * 0.1;
      const driftVx = Math.cos(p.driftAngle) * p.driftSpeed;
      const driftVy = Math.sin(p.driftAngle) * p.driftSpeed;

      const returnStrength = 0.005 * releaseFactor;
      const returnVx = (p.originX - p.x) * returnStrength;
      const returnVy = (p.originY - p.y) * returnStrength;

      p.vx = p.vx * 0.92 + driftVx + returnVx;
      p.vy = p.vy * 0.92 + driftVy + returnVy;

      p.x += p.vx;
      p.y += p.vy;

      const pad = p.size;
      if (p.x < pad) { p.x = pad; p.vx = Math.abs(p.vx) * 0.8; }
      if (p.x > this.width - pad) { p.x = this.width - pad; p.vx = -Math.abs(p.vx) * 0.8; }
      if (p.y < pad) { p.y = pad; p.vy = Math.abs(p.vy) * 0.8; }
      if (p.y > this.height - pad) { p.y = this.height - pad; p.vy = -Math.abs(p.vy) * 0.8; }
    }

    this.updateTrails();
  }

  private updateTrails(): void {
    for (const p of this.particles) {
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 0.5) {
        p.trail.unshift({ x: p.x, y: p.y, alpha: 0.8 });
        if (p.trail.length > p.maxTrailLength) {
          p.trail.pop();
        }
      }

      for (let i = 0; i < p.trail.length; i++) {
        p.trail[i].alpha = 0.8 * (1 - i / p.maxTrailLength);
      }

      if (speed <= 0.5 && p.trail.length > 0) {
        p.trail.pop();
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      for (let i = p.trail.length - 1; i >= 0; i--) {
        const t = p.trail[i];
        const trailSize = p.size * (1 - i / p.maxTrailLength) * 0.8;
        ctx.beginPath();
        ctx.arc(t.x, t.y, trailSize, 0, Math.PI * 2);
        ctx.fillStyle = rgbToString(p.color, t.alpha);
        ctx.fill();
      }

      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      gradient.addColorStop(0, rgbToString(p.color, 1));
      gradient.addColorStop(1, rgbToString(p.color, 0.6));

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }

  renderThumbnail(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const colors = this.currentPainting.colors.map(c => hexToRgb(c));
    const layout = this.currentPainting.layout;
    const margin = Math.min(w, h) * 0.1;
    const centerX = w / 2;
    const centerY = h / 2;
    const usableW = w - margin * 2;
    const usableH = h - margin * 2;

    const count = 80;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      const t = i / count;

      switch (layout) {
        case 'radial': {
          const r = Math.sqrt(t) * Math.min(usableW, usableH) * 0.45;
          const angle = i * 2.399963;
          x = centerX + Math.cos(angle) * r;
          y = centerY + Math.sin(angle) * r;
          break;
        }
        case 'spiral': {
          const angle = t * Math.PI * 10;
          const r = t * Math.min(usableW, usableH) * 0.42;
          x = centerX + Math.cos(angle) * r;
          y = centerY + Math.sin(angle) * r;
          break;
        }
        case 'grid': {
          const cols = Math.ceil(Math.sqrt(count * (usableW / usableH)));
          const rows = Math.ceil(count / cols);
          const col = i % cols;
          const row = Math.floor(i / cols);
          x = margin + col * (usableW / (cols - 1 || 1));
          y = margin + row * (usableH / (rows - 1 || 1));
          break;
        }
        case 'wave': {
          const rows = 4;
          const row = i % rows;
          const colT = Math.floor(i / rows) / Math.ceil(count / rows);
          x = margin + colT * usableW;
          y = margin + (row + 0.5) * (usableH / rows) +
              Math.sin(colT * Math.PI * 6 + row * 0.8) * usableH * 0.06;
          break;
        }
        default: {
          x = margin + Math.random() * usableW;
          y = margin + Math.random() * usableH;
        }
      }

      const color = colors[i % colors.length];
      const size = 1.5 + Math.random() * 3;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = rgbToString(color, 0.95);
      ctx.fill();
    }
  }
}
