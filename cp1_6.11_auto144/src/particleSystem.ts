export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  size: number;
  colorT: number;
  twinkleOffset: number;
  twinkleSpeed: number;
  attractX: number;
  attractY: number;
  attractZ: number;
  attractStrength: number;
}

export interface ParticleSystemParams {
  density: number;
  swirl: number;
  diverge: number;
  hueShift: number;
  saturation: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  z: number;
  color: string;
  life: number;
  maxLife: number;
  width: number;
}

export class ParticleSystem {
  public particles: Particle[] = [];
  public params: ParticleSystemParams;
  public rotation: number = 0;
  public rotationSpeed: number = (Math.PI * 2) / 30;
  public time: number = 0;
  public radius: number = 260;
  public trail: TrailPoint[] = [];

  private colorStops: [number, number, number][] = [
    this.hexToRgb('#ff6b6b'),
    this.hexToRgb('#f0e68c'),
    this.hexToRgb('#7ec8e3'),
  ];

  constructor(params: ParticleSystemParams) {
    this.params = { ...params };
    this.initParticles(params.density);
  }

  private hexToRgb(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  }

  private lerpColor(t: number): [number, number, number] {
    const stops = this.colorStops;
    const scaled = t * (stops.length - 1);
    const i = Math.min(Math.floor(scaled), stops.length - 2);
    const f = scaled - i;
    const c1 = stops[i];
    const c2 = stops[i + 1];
    return [
      c1[0] + (c2[0] - c1[0]) * f,
      c1[1] + (c2[1] - c1[1]) * f,
      c1[2] + (c2[2] - c1[2]) * f,
    ];
  }

  private hslShift(rgb: [number, number, number], hueShift: number, saturation: number): [number, number, number] {
    const [r, g, b] = rgb.map(c => c / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
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

    h = (h + hueShift / 360) % 1;
    if (h < 0) h += 1;
    s = Math.max(0, Math.min(1, s * (saturation / 100)));

    const hue2rgb = (p: number, q: number, tt: number) => {
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };

    let r2: number, g2: number, b2: number;
    if (s === 0) {
      r2 = g2 = b2 = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r2 = hue2rgb(p, q, h + 1 / 3);
      g2 = hue2rgb(p, q, h);
      b2 = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r2 * 255), Math.round(g2 * 255), Math.round(b2 * 255)];
  }

  public getParticleColor(p: Particle): [number, number, number] {
    const base = this.lerpColor(p.colorT);
    return this.hslShift(base, this.params.hueShift, this.params.saturation);
  }

  public getColorCss(rgb: [number, number, number], alpha: number = 1): string {
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
  }

  private initParticles(count: number): void {
    this.particles = new Array(count);
    for (let i = 0; i < count; i++) {
      this.particles[i] = this.createParticle();
    }
  }

  private createParticle(): Particle {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = this.radius * Math.pow(Math.random(), 0.55);

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    const colorT = Math.pow(r / this.radius, 0.7);

    return {
      x, y, z,
      baseX: x, baseY: y, baseZ: z,
      vx: 0, vy: 0, vz: 0,
      size: 0.5 + Math.random() * 2.0,
      colorT,
      twinkleOffset: Math.random() * Math.PI * 2,
      twinkleSpeed: (Math.PI * 2) / (2 + Math.random() * 3),
      attractX: 0, attractY: 0, attractZ: 0,
      attractStrength: 0,
    };
  }

  public setDensity(newDensity: number): void {
    const target = Math.round(newDensity);
    if (target === this.particles.length) return;

    if (target > this.particles.length) {
      while (this.particles.length < target) {
        this.particles.push(this.createParticle());
      }
    } else {
      this.particles.length = target;
    }
    this.params.density = target;
  }

  public setParams(partial: Partial<ParticleSystemParams>): void {
    if (partial.density !== undefined && partial.density !== this.params.density) {
      this.setDensity(partial.density);
      delete partial.density;
    }
    Object.assign(this.params, partial);
  }

  public addTrailPoint(screenX: number, screenY: number, cameraZ: number, fov: number, cx: number, cy: number): void {
    const scale = fov / (fov + cameraZ);
    const worldX = (screenX - cx) / scale;
    const worldY = (screenY - cy) / scale;
    const worldZ = 0;

    const avgColor = this.sampleColorNear(worldX, worldY, worldZ, 80);

    this.trail.push({
      x: worldX,
      y: worldY,
      z: worldZ,
      color: this.getColorCss(avgColor, 1),
      life: 2,
      maxLife: 2,
      width: 3 + Math.random() * 3,
    });

    for (const p of this.particles) {
      const dx = worldX - p.x;
      const dy = worldY - p.y;
      const dz = worldZ - p.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 120) {
        const force = (1 - dist / 120) * 1.8;
        p.attractX = worldX;
        p.attractY = worldY;
        p.attractZ = worldZ;
        p.attractStrength = Math.min(p.attractStrength + force, 2.5);
      }
    }
  }

  private sampleColorNear(x: number, y: number, z: number, range: number): [number, number, number] {
    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    const rangeSq = range * range;
    const step = Math.max(1, Math.floor(this.particles.length / 400));

    for (let i = 0; i < this.particles.length; i += step) {
      const p = this.particles[i];
      const dx = x - p.x;
      const dy = y - p.y;
      const dz = z - p.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < rangeSq) {
        const c = this.lerpColor(p.colorT);
        const shifted = this.hslShift(c, this.params.hueShift, this.params.saturation);
        const w = 1 - distSq / rangeSq;
        sumR += shifted[0] * w;
        sumG += shifted[1] * w;
        sumB += shifted[2] * w;
        count += w;
      }
    }

    if (count === 0) {
      return this.hslShift(this.colorStops[1], this.params.hueShift, this.params.saturation);
    }
    return [Math.round(sumR / count), Math.round(sumG / count), Math.round(sumB / count)];
  }

  public update(dt: number): void {
    this.time += dt;
    this.rotation += this.rotationSpeed * dt;

    const cosR = Math.cos(this.rotation);
    const sinR = Math.sin(this.rotation);
    const swirl = this.params.swirl;
    const diverge = this.params.diverge;

    for (const p of this.particles) {
      const angle = Math.atan2(p.baseY, p.baseX) + this.time * swirl * 0.15;
      const baseR = Math.sqrt(p.baseX * p.baseX + p.baseY * p.baseY);
      const drift = diverge * 30 * (1 + Math.sin(this.time * 0.3 + p.colorT * 10) * 0.3);
      const r = baseR + drift * p.colorT;

      let targetX = r * Math.cos(angle);
      let targetY = r * Math.sin(angle);
      let targetZ = p.baseZ + Math.sin(this.time * 0.4 + p.twinkleOffset) * 6 * diverge;

      const rotX = targetX * cosR - targetZ * sinR;
      const rotZ = targetX * sinR + targetZ * cosR;
      targetX = rotX;
      targetZ = rotZ;

      if (p.attractStrength > 0.01) {
        const ax = (p.attractX - targetX) * p.attractStrength * 0.25;
        const ay = (p.attractY - targetY) * p.attractStrength * 0.25;
        const az = (p.attractZ - targetZ) * p.attractStrength * 0.25;
        targetX += ax;
        targetY += ay;
        targetZ += az;
        p.attractStrength *= 0.96;
      }

      p.vx += (targetX - p.x) * 0.08;
      p.vy += (targetY - p.y) * 0.08;
      p.vz += (targetZ - p.z) * 0.08;
      p.vx *= 0.82;
      p.vy *= 0.82;
      p.vz *= 0.82;
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
    }

    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].life -= dt;
      if (this.trail[i].life <= 0) {
        this.trail.splice(i, 1);
      }
    }
  }

  public getTwinkleAlpha(p: Particle): number {
    const t = this.time * p.twinkleSpeed + p.twinkleOffset;
    return 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t));
  }
}
