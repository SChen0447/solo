import p5 from 'p5';
import { CONFIG, PieceColor, PlayerId, HexCoord, colorWithAlpha, hexToRgb } from './main';

function setFill(p: p5, hex: string, alpha: number): void {
  const { r, g, b } = hexToRgb(hex);
  p.fill(r, g, b, alpha);
}

function setStroke(p: p5, hex: string, alpha: number): void {
  const { r, g, b } = hexToRgb(hex);
  p.stroke(r, g, b, alpha);
}

export interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface LandExplosion {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export interface ResonanceEffect {
  x: number;
  y: number;
  startTime: number;
  particles: ExplosionParticle[];
  flashTime: number;
}

export interface PulsingSpot {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export class Piece {
  public color: PieceColor;
  public player: PlayerId;
  public hexQ: number;
  public hexR: number;
  public screenX: number = 0;
  public screenY: number = 0;
  public hp: number = 3;
  public maxHp: number = 3;
  public hasShield: boolean = false;
  public isDragging: boolean = false;
  public isHovered: boolean = false;
  public isHighlighted: boolean = false;
  public shieldedByWave: boolean = false;
  public waveGlowStartTime: number = 0;

  private trailParticles: TrailParticle[] = [];
  private landExplosion: LandExplosion | null = null;
  private particleTexturePhase: number = 0;
  private floatPhase: number;
  private baseY: number = 0;

  constructor(color: PieceColor, player: PlayerId, hexQ: number, hexR: number) {
    this.color = color;
    this.player = player;
    this.hexQ = hexQ;
    this.hexR = hexR;
    this.floatPhase = Math.random() * Math.PI * 2;
  }

  public getColorHex(): string {
    return CONFIG.COLORS[this.color];
  }

  public setScreenPosition(x: number, y: number): void {
    this.screenX = x;
    this.screenY = y;
    this.baseY = y;
  }

  public takeDamage(damage: number): boolean {
    if (this.hasShield || this.shieldedByWave) {
      this.hasShield = false;
      this.shieldedByWave = false;
      return false;
    }
    this.hp -= damage;
    return this.hp <= 0;
  }

  public update(dt: number, time: number): void {
    this.floatPhase += (dt / 1000) * Math.PI * 2;
    this.particleTexturePhase += dt * 0.005;

    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.life -= dt;
      if (p.life <= 0) {
        this.trailParticles.splice(i, 1);
      }
    }

    if (this.isDragging) {
      this.addTrailParticle(this.screenX, this.screenY);
    }
  }

  private addTrailParticle(x: number, y: number): void {
    if (Math.random() < 0.6) {
      this.trailParticles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 1,
        vy: (Math.random() - 0.5) * 1,
        life: 500,
        maxLife: 500,
        size: 3 + Math.random() * 3
      });
    }
  }

  public triggerLandExplosion(time: number, x: number, y: number): void {
    this.landExplosion = {
      x,
      y,
      startTime: time,
      duration: 300
    };
  }

  public render(p: p5, time: number, isOpponent: boolean): void {
    this.renderTrail(p);
    this.renderLandExplosion(p, time);

    const floatOffset = Math.sin(this.floatPhase) * 3;
    const renderY = this.isDragging ? this.screenY : this.baseY + floatOffset - 10;
    const renderX = this.screenX;

    let glowSize = CONFIG.PIECE_GLOW;
    if (isOpponent) glowSize = 8;
    if (this.shieldedByWave) glowSize = 10;

    const glowAlpha = this.shieldedByWave ? (0.6 + 0.4 * Math.sin(time * 0.01)) : 0.6;
    const color = this.getColorHex();

    p.drawingContext.save();
    p.drawingContext.shadowColor = color;
    p.drawingContext.shadowBlur = glowSize * 3;
    p.noStroke();
    setFill(p, color, glowAlpha * 255);
    p.circle(renderX, renderY, CONFIG.PIECE_RADIUS * 2 + glowSize * 2);
    p.drawingContext.restore();

    if (isOpponent) {
      p.noFill();
      p.stroke(color);
      p.strokeWeight(2);
      p.circle(renderX, renderY, CONFIG.PIECE_RADIUS * 2 + glowSize * 2 + 4);
    }

    this.renderCoreSphere(p, renderX, renderY, time);

    if (this.hasShield || this.shieldedByWave) {
      p.noFill();
      p.stroke(CONFIG.COLORS.SHIELD, 200 + Math.sin(time * 0.008) * 55);
      p.strokeWeight(2);
      p.circle(renderX, renderY, CONFIG.PIECE_RADIUS * 2 + 12);
    }
  }

  private renderCoreSphere(p: p5, x: number, y: number, time: number): void {
    const color = this.getColorHex();
    p.noStroke();

    const coreR = CONFIG.PIECE_RADIUS;
    for (let r = coreR; r > 0; r -= 2) {
      const t = r / coreR;
      const alpha = Math.floor(255 * (1 - t * 0.5));
      setFill(p, color, alpha);
      p.circle(x, y, r * 2);
    }

    p.fill(255, 255, 255, 180);
    p.circle(x - coreR * 0.3, y - coreR * 0.3, coreR * 0.4);

    this.renderParticleTexture(p, x, y, time);
  }

  private renderParticleTexture(p: p5, x: number, y: number, time: number): void {
    const color = this.getColorHex();
    const r = CONFIG.PIECE_RADIUS * 0.85;
    p.noStroke();

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + this.particleTexturePhase;
      const rad = r * (0.5 + 0.3 * Math.sin(this.particleTexturePhase * 2 + i));
      const px = x + Math.cos(angle) * rad;
      const py = y + Math.sin(angle) * rad;
      setFill(p, color, 150);
      p.circle(px, py, 2);
    }
  }

  private renderTrail(p: p5): void {
    const color = this.getColorHex();
    for (const tp of this.trailParticles) {
      const alpha = (tp.life / tp.maxLife) * 200;
      p.noStroke();
      setFill(p, color, alpha);
      p.circle(tp.x, tp.y, tp.size * (tp.life / tp.maxLife));
    }
  }

  private renderLandExplosion(p: p5, time: number): void {
    if (!this.landExplosion) return;
    const elapsed = time - this.landExplosion.startTime;
    if (elapsed > this.landExplosion.duration) {
      this.landExplosion = null;
      return;
    }
    const t = elapsed / this.landExplosion.duration;
    const radius = 60 * t;
    const alpha = (1 - t) * 200;
    const color = this.getColorHex();

    p.noFill();
    setStroke(p, color, alpha);
    p.strokeWeight(3 * (1 - t));
    p.circle(this.landExplosion.x, this.landExplosion.y, radius * 2);

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dist = radius * 0.9;
      const px = this.landExplosion.x + Math.cos(angle) * dist;
      const py = this.landExplosion.y + Math.sin(angle) * dist;
      p.noStroke();
      p.fill(255, 255, 255, alpha);
      p.circle(px, py, 3 * (1 - t));
    }
  }

  public containsPoint(px: number, py: number): boolean {
    const dx = px - this.screenX;
    const dy = py - this.screenY;
    return Math.sqrt(dx * dx + dy * dy) <= CONFIG.PIECE_RADIUS + 8;
  }

  public setHexCoord(q: number, r: number): void {
    this.hexQ = q;
    this.hexR = r;
  }

  public getHexCoord(): HexCoord {
    return { q: this.hexQ, r: this.hexR };
  }
}

export function createResonanceParticles(cx: number, cy: number): ExplosionParticle[] {
  const particles: ExplosionParticle[] = [];
  const colors = [CONFIG.COLORS.RED, CONFIG.COLORS.BLUE, CONFIG.COLORS.GREEN, CONFIG.COLORS.RESONANCE];

  for (let i = 0; i < 200; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1000,
      maxLife: 1000,
      size: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
  return particles;
}

export function updateResonanceParticles(particles: ExplosionParticle[], dt: number, cx: number, cy: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const dx = cx - p.x;
    const dy = cy - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const pullStrength = 0.15;
    p.vx += (dx / dist) * pullStrength;
    p.vy += (dy / dist) * pullStrength;
    p.x += p.vx * (dt / 16);
    p.y += p.vy * (dt / 16);
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

export function renderResonanceEffect(
  p: p5,
  time: number,
  effect: ResonanceEffect
): void {
  const elapsed = time - effect.startTime;

  if (elapsed < 100) {
    const alpha = 255 * (1 - elapsed / 100);
    p.fill(255, 255, 255, alpha);
    p.noStroke();
    p.circle(effect.x, effect.y, 120);
  }

  for (const pt of effect.particles) {
    const alpha = (pt.life / pt.maxLife) * 220;
    p.noStroke();
    setFill(p, pt.color, alpha);
    p.circle(pt.x, pt.y, pt.size * (pt.life / pt.maxLife));
  }

  if (elapsed < 1000) {
    const spiralAlpha = (1 - elapsed / 1000) * 120;
    p.noFill();
    setStroke(p, CONFIG.COLORS.RESONANCE, spiralAlpha);
    p.strokeWeight(2);
    for (let s = 0; s < 3; s++) {
      p.beginShape();
      const startAngle = (s / 3) * Math.PI * 2 + elapsed * 0.005;
      for (let a = 0; a < Math.PI * 4; a += 0.1) {
        const r = a * 10 * (elapsed / 1000);
        const px = effect.x + Math.cos(startAngle + a) * r;
        const py = effect.y + Math.sin(startAngle + a) * r;
        p.vertex(px, py);
      }
      p.endShape();
    }
  }
}

export function renderPulsingSpot(
  p: p5,
  time: number,
  spot: PulsingSpot
): void {
  const elapsed = time - spot.startTime;
  if (elapsed > spot.duration) return;

  const t = elapsed / spot.duration;
  const size = 20 * (1 - t);
  const pulse = 0.5 + 0.5 * Math.sin(elapsed * 0.006);
  const alpha = (1 - t) * (0.4 + 0.4 * pulse) * 255;

  p.drawingContext.save();
  p.drawingContext.shadowColor = CONFIG.COLORS.RESONANCE;
  p.drawingContext.shadowBlur = 20;
  p.noStroke();
  setFill(p, CONFIG.COLORS.RESONANCE, alpha);
  p.circle(spot.x, spot.y, size * 2);
  p.drawingContext.restore();
}
