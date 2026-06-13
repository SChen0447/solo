import { PixelData } from './image-loader';

export interface Particle {
  originX: number;
  originY: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  h: number;
  s: number;
  l: number;
  r: number;
  g: number;
  b: number;
  size: number;
  phase: number;
  breathPeriod: number;
  vx: number;
  vy: number;
  exploding: boolean;
  explodeEnd: number;
  alpha: number;
  resetting: boolean;
  resetStartX: number;
  resetStartY: number;
}

export interface MouseState {
  x: number;
  y: number;
  isOver: boolean;
  prevX: number;
  prevY: number;
  moved: boolean;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export class ParticleSystem {
  particles: Particle[] = [];
  mouse: MouseState = { x: 0, y: 0, isOver: false, prevX: 0, prevY: 0, moved: false };
  decomposeProgress = 0;
  isDecomposed = false;
  isResetting = false;
  resetProgress = 0;
  resetStartTime = 0;
  canvasWidth: number;
  canvasHeight: number;
  lastTime = 0;
  private gridCellSize = 50;
  private grid: Map<number, number[]> = new Map();

  constructor(canvasWidth: number, canvasHeight: number, pixelData: PixelData[]) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.particles = pixelData.map((px) => {
      const [h, s, l] = rgbToHsl(px.r, px.g, px.b);
      const adjustedL = Math.min(100, l * 1.05);
      return {
        originX: px.x,
        originY: px.y,
        x: px.x,
        y: px.y,
        prevX: px.x,
        prevY: px.y,
        h, s, l: adjustedL,
        r: px.r, g: px.g, b: px.b,
        size: 2 + Math.random() * 4,
        phase: Math.random() * Math.PI * 2,
        breathPeriod: 2 + Math.random(),
        vx: 0,
        vy: 0,
        exploding: false,
        explodeEnd: 0,
        alpha: 1,
        resetting: false,
        resetStartX: 0,
        resetStartY: 0,
      };
    });
  }

  handleMouseMove(x: number, y: number): void {
    this.mouse.prevX = this.mouse.x;
    this.mouse.prevY = this.mouse.y;
    this.mouse.x = x;
    this.mouse.y = y;
    this.mouse.moved = true;
  }

  handleMouseEnter(): void {
    this.mouse.isOver = true;
  }

  handleMouseLeave(): void {
    this.mouse.isOver = false;
    this.mouse.moved = false;
  }

  handleClick(x: number, y: number): void {
    if (!this.isDecomposed) return;
    const now = performance.now();
    const explosionRadius = 200;
    const explosionSpeed = 400;
    for (const p of this.particles) {
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < explosionRadius && dist > 0) {
        const angle = Math.atan2(dy, dx);
        const force = (1 - dist / explosionRadius) * explosionSpeed;
        p.vx = Math.cos(angle) * force;
        p.vy = Math.sin(angle) * force;
        p.exploding = true;
        p.explodeEnd = now + 800;
      }
    }
  }

  startReset(): void {
    if (this.isResetting) return;
    if (!this.isDecomposed && this.decomposeProgress === 0) return;
    this.isResetting = true;
    this.resetProgress = 0;
    this.resetStartTime = performance.now();
    for (const p of this.particles) {
      p.resetStartX = p.x;
      p.resetStartY = p.y;
      p.resetting = true;
      p.exploding = false;
      p.vx = 0;
      p.vy = 0;
    }
  }

  update(time: number): void {
    const dt = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.05) : 0.016;
    this.lastTime = time;

    if (this.isResetting) {
      this.updateReset(time);
      return;
    }

    if (this.mouse.isOver && !this.isDecomposed) {
      this.decomposeProgress = Math.min(1, this.decomposeProgress + dt / 2);
      if (this.decomposeProgress >= 1) {
        this.isDecomposed = true;
      }
    }

    const now = performance.now();
    const timeSec = time / 1000;

    for (const p of this.particles) {
      p.prevX = p.x;
      p.prevY = p.y;

      if (p.exploding) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
        if (now >= p.explodeEnd) {
          p.exploding = false;
        }
        continue;
      }

      const breathOffsetY = 3 * Math.sin(timeSec * (2 * Math.PI / p.breathPeriod) + p.phase);
      const randomOffsetY = Math.sin(timeSec * 0.7 + p.phase * 2) * 5;

      if (this.isDecomposed && this.mouse.isOver) {
        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxInfluence = 250;

        if (dist < maxInfluence && dist > 1) {
          const influence = (1 - dist / maxInfluence);
          const angle = Math.atan2(dy, dx);
          const tangentAngle = angle + Math.PI / 2;

          const swirlStrength = influence * 120;
          const attractStrength = influence * 0.15;

          const swirlX = Math.cos(tangentAngle) * swirlStrength;
          const swirlY = Math.sin(tangentAngle) * swirlStrength;

          const targetX = p.originX + swirlX - dx * attractStrength;
          const targetY = p.originY + swirlY - dy * attractStrength;

          p.x += (targetX - p.x) * 0.06;
          p.y += (targetY - p.y) * 0.06;
        } else {
          p.x += (p.originX - p.x) * 0.04;
          p.y += (p.originY + randomOffsetY - p.y) * 0.04;
        }
        p.y += breathOffsetY * 0.3;
      } else if (this.isDecomposed) {
        p.x += (p.originX - p.x) * 0.04;
        p.y += (p.originY + randomOffsetY - p.y) * 0.04;
        p.y += breathOffsetY * 0.3;
      } else {
        const progress = this.decomposeProgress;
        const driftX = Math.sin(timeSec * 0.5 + p.phase) * progress * 8;
        const driftY = Math.cos(timeSec * 0.3 + p.phase * 1.5) * progress * 5;
        p.x = p.originX + driftX;
        p.y = p.originY + driftY + breathOffsetY * progress;
      }
    }

    this.mouse.moved = false;
    this.buildGrid();
  }

  private updateReset(time: number): void {
    const elapsed = (time - this.resetStartTime) / 1500;
    this.resetProgress = Math.min(1, elapsed);
    const eased = easeInOut(this.resetProgress);

    for (const p of this.particles) {
      p.prevX = p.x;
      p.prevY = p.y;
      p.x = p.resetStartX + (p.originX - p.resetStartX) * eased;
      p.y = p.resetStartY + (p.originY - p.resetStartY) * eased;
    }

    if (this.resetProgress >= 1) {
      this.isResetting = false;
      this.isDecomposed = false;
      this.decomposeProgress = 0;
      for (const p of this.particles) {
        p.resetting = false;
        p.x = p.originX;
        p.y = p.originY;
        p.vx = 0;
        p.vy = 0;
        p.exploding = false;
      }
    }

    this.buildGrid();
  }

  private buildGrid(): void {
    this.grid.clear();
    const cellSize = this.gridCellSize;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const cx = Math.floor(p.x / cellSize);
      const cy = Math.floor(p.y / cellSize);
      const key = cy * 10000 + cx;
      let cell = this.grid.get(key);
      if (!cell) {
        cell = [];
        this.grid.set(key, cell);
      }
      cell.push(i);
    }
  }

  getConnectionPairs(maxPairs: number): [number, number][] {
    const pairs: [number, number][] = [];
    const cellSize = this.gridCellSize;
    const maxDistSq = 50 * 50;
    let count = 0;

    for (const [key, indices] of this.grid) {
      if (count >= maxPairs) break;
      const cy = Math.floor(key / 10000);
      const cx = key - cy * 10000;

      for (let dy = 0; dy <= 1; dy++) {
        for (let dx = (dy === 0 ? 0 : -1); dx <= 1; dx++) {
          if (count >= maxPairs) break;
          const nKey = (cy + dy) * 10000 + (cx + dx);
          const neighbor = this.grid.get(nKey);
          if (!neighbor) continue;

          const isSame = (dy === 0 && dx === 0);

          for (let i = 0; i < indices.length && count < maxPairs; i++) {
            const aIdx = indices[i];
            const a = this.particles[aIdx];
            const startJ = isSame ? i + 1 : 0;

            for (let j = startJ; j < neighbor.length && count < maxPairs; j++) {
              const bIdx = neighbor[j];

              const b = this.particles[bIdx];
              const ddx = a.x - b.x;
              const ddy = a.y - b.y;
              const distSq = ddx * ddx + ddy * ddy;

              if (distSq < maxDistSq) {
                let hueDiff = Math.abs(a.h - b.h);
                if (hueDiff > 180) hueDiff = 360 - hueDiff;
                if (hueDiff < 30) {
                  pairs.push([aIdx, bIdx]);
                  count++;
                }
              }
            }
          }
        }
      }
    }

    return pairs;
  }
}
