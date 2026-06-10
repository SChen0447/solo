export const COLOR_THEMES: string[][] = [
  ['#ff6b6b', '#ffa94d', '#ffd43b', '#ff8787', '#fa5252'],
  ['#339af0', '#22b8cf', '#4dabf7', '#74c0fc', '#15aabf'],
  ['#ff66cc', '#66ffcc', '#ffcc66', '#66ccff', '#cc66ff'],
  ['#a0522d', '#d2691e', '#8b4513', '#cd853f', '#deb887'],
  ['#ff0000', '#ff9900', '#ffff00', '#00cc00', '#3333ff']
];

export interface FluidBlobData {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  targetColor: string;
  colorTransitionProgress: number;
  glowPhase: number;
  glowSpeed: number;
  textureSeed: number;
  birthTime: number;
}

export interface ParticleData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function mixColors(c1: string, c2: string): string {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  return rgbToHex((a.r + b.r) / 2, (a.g + b.g) / 2, (a.b + b.b) / 2);
}

function lerpColor(c1: string, c2: string, t: number): string {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  );
}

function shiftHue(hex: string, degrees: number): string {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
      case gn: h = ((bn - rn) / d + 2) / 6; break;
      case bn: h = ((rn - gn) / d + 4) / 6; break;
    }
  }
  h = (h + degrees / 360) % 1;
  if (h < 0) h += 1;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return rgbToHex(
    hue2rgb(p, q, h + 1/3) * 255,
    hue2rgb(p, q, h) * 255,
    hue2rgb(p, q, h - 1/3) * 255
  );
}

class SpatialHash {
  cellSize: number;
  grid: Map<string, number[]>;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  clear(): void {
    this.grid.clear();
  }

  insert(x: number, y: number, id: number): void {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const key = `${cx},${cy}`;
    if (!this.grid.has(key)) this.grid.set(key, []);
    this.grid.get(key)!.push(id);
  }

  query(x: number, y: number): number[] {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const result: number[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        const cell = this.grid.get(key);
        if (cell) result.push(...cell);
      }
    }
    return result;
  }
}

export class FluidSystem {
  blobs: FluidBlobData[] = [];
  particles: ParticleData[] = [];
  private nextId = 0;
  private lastSplitCheck = 0;
  private themeIndex = 2;
  private spatialHash: SpatialHash;
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.spatialHash = new SpatialHash(100);
  }

  getThemeIndex(): number {
    return this.themeIndex;
  }

  getCurrentTheme(): string[] {
    return COLOR_THEMES[this.themeIndex];
  }

  setTheme(index: number): void {
    if (index < 0 || index >= COLOR_THEMES.length) return;
    this.themeIndex = index;
    const theme = COLOR_THEMES[index];
    for (const blob of this.blobs) {
      const colorIdx = Math.floor(Math.random() * theme.length);
      blob.targetColor = theme[colorIdx];
      blob.colorTransitionProgress = 0;
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  createBlob(x: number, y: number, dx: number = 0, dy: number = 0): void {
    const theme = COLOR_THEMES[this.themeIndex];
    const color = theme[Math.floor(Math.random() * theme.length)];
    const speed = 0.5 + Math.random() * 1.5;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    this.blobs.push({
      id: this.nextId++,
      x,
      y,
      vx: (dx / len) * speed,
      vy: (dy / len) * speed,
      radius: 20 + Math.random() * 10,
      color,
      targetColor: color,
      colorTransitionProgress: 1,
      glowPhase: Math.random() * Math.PI * 2,
      glowSpeed: (Math.PI * 2) / (2000 + Math.random() * 2000),
      textureSeed: Math.random() * 1000,
      birthTime: performance.now()
    });
  }

  private spawnSplitParticles(x: number, y: number, color: string): void {
    const count = 10 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 2,
        color,
        life: 2000,
        maxLife: 2000
      });
    }
  }

  private trySplit(blob: FluidBlobData, now: number): FluidBlobData[] | null {
    if (Math.random() > 0.05) return null;
    if (blob.radius < 15) return null;
    const newRadius = blob.radius * 0.6;
    const angle = Math.random() * Math.PI * 2;
    const dist = newRadius * 0.8;
    const color1 = shiftHue(blob.color, -20);
    const color2 = shiftHue(blob.color, 20);
    this.spawnSplitParticles(blob.x, blob.y, blob.color);
    return [
      {
        ...blob,
        id: this.nextId++,
        x: blob.x + Math.cos(angle) * dist,
        y: blob.y + Math.sin(angle) * dist,
        vx: blob.vx + Math.cos(angle) * 1,
        vy: blob.vy + Math.sin(angle) * 1,
        radius: newRadius,
        color: color1,
        targetColor: color1,
        colorTransitionProgress: 1,
        glowPhase: Math.random() * Math.PI * 2,
        textureSeed: Math.random() * 1000,
        birthTime: now
      },
      {
        ...blob,
        id: this.nextId++,
        x: blob.x - Math.cos(angle) * dist,
        y: blob.y - Math.sin(angle) * dist,
        vx: blob.vx - Math.cos(angle) * 1,
        vy: blob.vy - Math.sin(angle) * 1,
        radius: newRadius,
        color: color2,
        targetColor: color2,
        colorTransitionProgress: 1,
        glowPhase: Math.random() * Math.PI * 2,
        textureSeed: Math.random() * 1000,
        birthTime: now
      }
    ];
  }

  update(dt: number, now: number): void {
    for (const blob of this.blobs) {
      blob.glowPhase += blob.glowSpeed * dt;
      if (blob.colorTransitionProgress < 1) {
        blob.colorTransitionProgress = Math.min(1, blob.colorTransitionProgress + dt / 500);
        blob.color = lerpColor(blob.color, blob.targetColor, 0.05);
      }
    }

    this.spatialHash.clear();
    for (let i = 0; i < this.blobs.length; i++) {
      this.spatialHash.insert(this.blobs[i].x, this.blobs[i].y, i);
    }

    const toRemove = new Set<number>();
    const toAdd: FluidBlobData[] = [];

    for (let i = 0; i < this.blobs.length; i++) {
      if (toRemove.has(i)) continue;
      const a = this.blobs[i];
      const nearby = this.spatialHash.query(a.x, a.y);

      for (const j of nearby) {
        if (j <= i || toRemove.has(i) || toRemove.has(j)) continue;
        const b = this.blobs[j];
        const ddx = b.x - a.x;
        const ddy = b.y - a.y;
        const distSq = ddx * ddx + ddy * ddy;
        const rSum = a.radius + b.radius;

        if (distSq < rSum * rSum) {
          if (Math.random() < 0.7) {
            const dist = Math.sqrt(distSq) || 1;
            const nx = ddx / dist;
            const ny = ddy / dist;
            const totalArea = a.radius * a.radius + b.radius * b.radius;
            const newRadius = Math.sqrt(totalArea);
            const ratioA = (a.radius * a.radius) / totalArea;
            const ratioB = (b.radius * b.radius) / totalArea;
            a.x = a.x * ratioA + b.x * ratioB;
            a.y = a.y * ratioA + b.y * ratioB;
            a.vx = a.vx * ratioA + b.vx * ratioB;
            a.vy = a.vy * ratioA + b.vy * ratioB;
            a.radius = newRadius;
            a.color = mixColors(a.color, b.color);
            a.targetColor = a.color;
            toRemove.add(j);
          }
        } else if (distSq < (rSum * 1.5) * (rSum * 1.5)) {
          const dist = Math.sqrt(distSq);
          const overlap = rSum * 1.5 - dist;
          const nx = ddx / dist;
          const ny = ddy / dist;
          const force = overlap * 0.05;
          a.vx -= nx * force;
          a.vy -= ny * force;
          b.vx += nx * force;
          b.vy += ny * force;
        }
      }
    }

    if (now - this.lastSplitCheck > 500) {
      this.lastSplitCheck = now;
      for (let i = 0; i < this.blobs.length; i++) {
        if (toRemove.has(i)) continue;
        const result = this.trySplit(this.blobs[i], now);
        if (result) {
          toRemove.add(i);
          toAdd.push(...result);
        }
      }
    }

    for (let i = 0; i < this.blobs.length; i++) {
      if (toRemove.has(i)) continue;
      const blob = this.blobs[i];
      blob.x += blob.vx;
      blob.y += blob.vy;
      blob.vx *= 0.995;
      blob.vy *= 0.995;

      if (blob.x < blob.radius) {
        blob.x = blob.radius;
        blob.vx *= -0.8;
      } else if (blob.x > this.width - blob.radius) {
        blob.x = this.width - blob.radius;
        blob.vx *= -0.8;
      }
      if (blob.y < blob.radius) {
        blob.y = blob.radius;
        blob.vy *= -0.8;
      } else if (blob.y > this.height - blob.radius) {
        blob.y = this.height - blob.radius;
        blob.vy *= -0.8;
      }
    }

    this.blobs = this.blobs.filter((_, i) => !toRemove.has(i));
    this.blobs.push(...toAdd);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }
}
