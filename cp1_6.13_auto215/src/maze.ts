export interface LevelConfig {
  level: number;
  trackColors: string[];
  cracksPerTrack: number;
  pulseSpeed: number;
}

export interface PlayerPos {
  ring: number;
  segment: number;
}

interface Particle {
  active: boolean;
  ring: number;
  angle: number;
  speed: number;
}

interface Crack {
  ring: number;
  startSegment: number;
  lengthSegments: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  period: number;
}

interface StarGateParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export const RING_COUNT = 6;
export const SEGMENTS_PER_RING = 12;
export const SEGMENT_ANGLE = (Math.PI * 2) / SEGMENTS_PER_RING;

const TRACK_COLORS_DEFAULT = ['#ff6b6b', '#ff8e72', '#ffb07c', '#a5e3a0', '#74f2ce', '#48dbfb'];
const ALT_COLOR_POOL = ['#f72585', '#b5179e', '#7209b7', '#3a0ca3', '#4361ee', '#4cc9f0'];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Maze {
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private centerX = 0;
  private centerY = 0;
  private baseInnerRadius = 100;
  private trackSpacing = 50;
  private radii: number[] = [];

  private stars: Star[] = [];
  private particles: Particle[] = [];
  private maxParticles = 120;
  private cracks: Crack[] = [];
  private rotations: number[] = [];
  private rotationSpeeds: number[] = [];

  private exitRing = 0;
  private exitSegment = 0;
  private exitGateAngle = 0;

  private entryRing = RING_COUNT - 1;
  private entrySegment = 0;

  private connections: Map<string, boolean> = new Map();
  private lastPathChange = 0;
  private pathChangeInterval = 5000;

  private starGateParticles: StarGateParticle[] = [];
  private maxGateParticles = 80;
  private gateBurstProgress = 0;
  private gateBurstActive = false;

  private trackColors: string[] = TRACK_COLORS_DEFAULT.slice();
  private cracksPerTrack = 2;
  private pulseSpeed = 0.3;
  private time = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.initStars();
    this.initParticles();
    this.initGateParticles();
    this.initRotations();
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.centerX = w / 2;
    this.centerY = h / 2;

    const isSmall = w < 800;
    this.trackSpacing = isSmall ? 40 : 50;
    const innerPct = isSmall ? 0.12 : 0.15;
    this.baseInnerRadius = Math.max(100, h * innerPct);

    this.radii = [];
    for (let i = 0; i < RING_COUNT; i++) {
      this.radii.push(this.baseInnerRadius + i * this.trackSpacing);
    }
  }

  private initStars() {
    this.stars = [];
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: 1 + Math.random() * 2,
        baseAlpha: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        period: 2 + Math.random() * 2,
      });
    }
  }

  private initParticles() {
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        ring: 0,
        angle: 0,
        speed: 0,
      });
    }
  }

  private initGateParticles() {
    this.starGateParticles = [];
    for (let i = 0; i < this.maxGateParticles; i++) {
      this.starGateParticles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
      });
    }
  }

  private initRotations() {
    this.rotations = new Array(RING_COUNT).fill(0);
    this.rotationSpeeds = [];
    for (let i = 0; i < RING_COUNT; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      this.rotationSpeeds.push(dir * (0.05 + Math.random() * 0.05));
    }
  }

  setupLevel(config: LevelConfig) {
    this.trackColors = config.trackColors.slice();
    this.cracksPerTrack = Math.min(5, config.cracksPerTrack);
    this.pulseSpeed = config.pulseSpeed;

    this.entryRing = RING_COUNT - 1;
    this.entrySegment = 0;
    this.exitRing = 0;
    this.exitSegment = Math.floor(Math.random() * SEGMENTS_PER_RING);

    this.generateCracks();
    this.generateConnections();
    this.resetParticles();
    this.lastPathChange = performance.now();
  }

  private generateCracks() {
    this.cracks = [];
    for (let r = 0; r < RING_COUNT; r++) {
      if (r === this.exitRing || r === this.entryRing) {
        if (this.cracksPerTrack <= 2) continue;
      }
      const used = new Set<number>();
      const count = Math.min(SEGMENTS_PER_RING - 2, this.cracksPerTrack);
      let attempts = 0;
      while (used.size < count && attempts < 50) {
        const seg = Math.floor(Math.random() * SEGMENTS_PER_RING);
        if (r === this.entryRing && seg === this.entrySegment) {
          attempts++;
          continue;
        }
        if (r === this.exitRing && seg === this.exitSegment) {
          attempts++;
          continue;
        }
        let ok = true;
        for (const s of used) {
          if (Math.abs(s - seg) <= 1 || Math.abs(s - seg) >= SEGMENTS_PER_RING - 1) {
            ok = false;
            break;
          }
        }
        if (ok) used.add(seg);
        attempts++;
      }
      for (const seg of used) {
        this.cracks.push({ ring: r, startSegment: seg, lengthSegments: 2 });
      }
    }
  }

  regenerateCracksForRing(ring: number) {
    this.cracks = this.cracks.filter(c => c.ring !== ring);
    const used = new Set<number>();
    const count = Math.min(SEGMENTS_PER_RING - 2, this.cracksPerTrack);
    let attempts = 0;
    while (used.size < count && attempts < 50) {
      const seg = Math.floor(Math.random() * SEGMENTS_PER_RING);
      if (ring === this.entryRing && seg === this.entrySegment) { attempts++; continue; }
      if (ring === this.exitRing && seg === this.exitSegment) { attempts++; continue; }
      let ok = true;
      for (const s of used) {
        if (Math.abs(s - seg) <= 1 || Math.abs(s - seg) >= SEGMENTS_PER_RING - 1) { ok = false; break; }
      }
      if (ok) used.add(seg);
      attempts++;
    }
    for (const seg of used) {
      this.cracks.push({ ring, startSegment: seg, lengthSegments: 2 });
    }
  }

  private generateConnections() {
    this.connections.clear();
    for (let r = 0; r < RING_COUNT - 1; r++) {
      const numConn = 2 + Math.floor(Math.random() * 2);
      const used = new Set<number>();
      let attempts = 0;
      while (used.size < numConn && attempts < 30) {
        const seg = Math.floor(Math.random() * SEGMENTS_PER_RING);
        if (!used.has(seg)) {
          used.add(seg);
          this.connections.set(`${r}-${seg}`, true);
        }
        attempts++;
      }
    }
  }

  private resetParticles() {
    for (const p of this.particles) p.active = false;
    const perRing = Math.floor(this.maxParticles / RING_COUNT);
    for (let r = 0; r < RING_COUNT; r++) {
      for (let i = 0; i < perRing; i++) {
        const p = this.particles[r * perRing + i];
        if (p) {
          p.active = true;
          p.ring = r;
          p.angle = (i / perRing) * Math.PI * 2 + Math.random() * 0.3;
          p.speed = this.pulseSpeed;
        }
      }
    }
  }

  getEntryPos(): PlayerPos {
    return { ring: this.entryRing, segment: this.entrySegment };
  }

  getExitPos(): PlayerPos {
    return { ring: this.exitRing, segment: this.exitSegment };
  }

  getTrackColors(): string[] {
    return this.trackColors;
  }

  getRadii(): number[] {
    return this.radii;
  }

  getRotations(): number[] {
    return this.rotations;
  }

  hasConnection(ring: number, segment: number): boolean {
    return this.connections.has(`${ring}-${segment}`);
  }

  isCrackAt(ring: number, segment: number): boolean {
    const normSeg = ((segment % SEGMENTS_PER_RING) + SEGMENTS_PER_RING) % SEGMENTS_PER_RING;
    for (const c of this.cracks) {
      if (c.ring !== ring) continue;
      for (let i = 0; i < c.lengthSegments; i++) {
        const s = (c.startSegment + i) % SEGMENTS_PER_RING;
        if (s === normSeg) return true;
      }
    }
    return false;
  }

  getWorldPos(ring: number, segment: number): { x: number; y: number } {
    const radius = this.radii[ring] || 0;
    const rot = this.rotations[ring] || 0;
    const angle = segment * SEGMENT_ANGLE + rot - Math.PI / 2;
    return {
      x: this.centerX + Math.cos(angle) * radius,
      y: this.centerY + Math.sin(angle) * radius,
    };
  }

  getCenter(): { x: number; y: number } {
    return { x: this.centerX, y: this.centerY };
  }

  triggerGateBurst() {
    this.gateBurstActive = true;
    this.gateBurstProgress = 0;
    const pos = this.getWorldPos(this.exitRing, this.exitSegment);
    for (const p of this.starGateParticles) {
      if (p.active) continue;
      p.active = true;
      p.x = pos.x;
      p.y = pos.y;
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0;
      p.maxLife = 1.0 + Math.random() * 0.4;
    }
  }

  update(dt: number) {
    this.time += dt;

    for (let i = 0; i < RING_COUNT; i++) {
      this.rotations[i] += this.rotationSpeeds[i] * dt;
    }

    this.exitGateAngle += Math.PI * dt;

    for (const p of this.particles) {
      if (!p.active) continue;
      p.angle += p.speed * Math.PI * 2 * dt;
      if (p.angle > Math.PI * 2) p.angle -= Math.PI * 2;
    }

    for (const p of this.starGateParticles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }

    if (this.gateBurstActive) {
      this.gateBurstProgress += dt / 1.2;
      if (this.gateBurstProgress >= 1) {
        this.gateBurstActive = false;
        this.gateBurstProgress = 0;
      }
    }

    if (performance.now() - this.lastPathChange > this.pathChangeInterval) {
      this.generateConnections();
      this.lastPathChange = performance.now();
    }
  }

  render() {
    const ctx = this.ctx;
    this.renderBackground();
    this.renderTracks();
    this.renderConnections();
    this.renderParticles();
    this.renderCracks();
    this.renderEntry();
    this.renderExit();
    this.renderGateParticles();
  }

  private renderBackground() {
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(this.centerX, this.centerY, 0, this.centerX, this.centerY, Math.max(this.width, this.height) * 0.7);
    grad.addColorStop(0, '#0a0e27');
    grad.addColorStop(1, '#1c1635');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const s of this.stars) {
      const x = s.x * this.width;
      const y = s.y * this.height;
      const pulse = Math.sin(this.time * (Math.PI * 2 / s.period) + s.phase) * 0.5 + 0.5;
      const alpha = s.baseAlpha * (0.6 + pulse * 0.4);
      ctx.beginPath();
      ctx.arc(x, y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    }
  }

  private glow(color: string, radius: number) {
    const ctx = this.ctx;
    ctx.shadowColor = color;
    ctx.shadowBlur = radius;
  }

  private noGlow() {
    this.ctx.shadowBlur = 0;
  }

  private renderTracks() {
    const ctx = this.ctx;
    for (let r = 0; r < RING_COUNT; r++) {
      const radius = this.radii[r];
      const color = this.trackColors[r];
      ctx.save();
      this.glow(color, 15);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    this.noGlow();
  }

  private renderConnections() {
    const ctx = this.ctx;
    this.connections.forEach((_, key) => {
      const [rStr, segStr] = key.split('-');
      const r = parseInt(rStr);
      const seg = parseInt(segStr);
      const inner = this.getWorldPos(r, seg);
      const outer = this.getWorldPos(r + 1, seg);
      const color = this.trackColors[r];
      ctx.save();
      this.glow(color, 10);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(inner.x, inner.y);
      ctx.lineTo(outer.x, outer.y);
      ctx.stroke();
      ctx.restore();
    });
    this.noGlow();
  }

  private renderParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      if (!p.active) continue;
      const radius = this.radii[p.ring];
      const rot = this.rotations[p.ring];
      const x = this.centerX + Math.cos(p.angle + rot) * radius;
      const y = this.centerY + Math.sin(p.angle + rot) * radius;
      const color = this.trackColors[p.ring];
      ctx.save();
      this.glow(color, 8);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    this.noGlow();
    ctx.globalAlpha = 1;
  }

  private renderCracks() {
    const ctx = this.ctx;
    for (const c of this.cracks) {
      const radius = this.radii[c.ring];
      const rot = this.rotations[c.ring];
      const startAng = c.startSegment * SEGMENT_ANGLE + rot - Math.PI / 2;
      const endAng = (c.startSegment + c.lengthSegments) * SEGMENT_ANGLE + rot - Math.PI / 2;
      ctx.save();
      this.glow('#2d0a4e', 10);
      ctx.strokeStyle = 'rgba(26, 14, 48, 0.95)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, radius, startAng, endAng);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(45, 10, 78, 0.8)';
      ctx.lineWidth = 10;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, radius, startAng, endAng);
      ctx.stroke();
      ctx.restore();
    }
    this.noGlow();
    ctx.globalAlpha = 1;
  }

  private renderEntry() {
    const pos = this.getWorldPos(this.entryRing, this.entrySegment);
    const ctx = this.ctx;
    const color = this.trackColors[this.entryRing];
    ctx.save();
    this.glow(color, 20);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.noGlow();
  }

  private renderExit() {
    const pos = this.getWorldPos(this.exitRing, this.exitSegment);
    const ctx = this.ctx;
    const t = this.time;
    const size = this.gateBurstActive ? 14 + this.gateBurstProgress * 30 : 14;

    ctx.save();
    this.glow('#ffd700', 30);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = this.exitGateAngle + (i * Math.PI) / 4;
      const x = pos.x + Math.cos(a) * size;
      const y = pos.y + Math.sin(a) * size;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd700';
      ctx.fill();
    }
    ctx.strokeStyle = '#ffd700';
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = this.exitGateAngle + (i * Math.PI) / 4;
      const x = pos.x + Math.cos(a) * size;
      const y = pos.y + Math.sin(a) * size;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    this.noGlow();
  }

  private renderGateParticles() {
    const ctx = this.ctx;
    for (const p of this.starGateParticles) {
      if (!p.active) continue;
      const t = 1 - p.life / p.maxLife;
      ctx.save();
      this.glow('#ffd700', 10);
      ctx.fillStyle = `rgba(255, 215, 0, ${t})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2 + t * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    this.noGlow();
  }

  static pickColorsForLevel(level: number): string[] {
    if (level <= 1) return TRACK_COLORS_DEFAULT.slice();
    const pool = shuffle(ALT_COLOR_POOL);
    return pool.slice(0, RING_COUNT);
  }
}
