import type { RuneFragment, Particle, Ripple } from './types';
import type p5 from 'p5';

const COLORS = ['#ffcc66', '#ff8866', '#66ffcc', '#cc66ff'];
const RUNE_COUNT = 12;
const MIN_RADIUS = 15;
const MAX_RADIUS = 25;
const PULSE_MIN = 0.95;
const PULSE_MAX = 1.05;

export class RuneManager {
  private p: p5;
  private runes: RuneFragment[] = [];
  private width: number;
  private height: number;
  private lastRotationChange: number = 0;
  private particles: Particle[] = [];
  private ripples: Ripple[] = [];

  constructor(p: p5, width: number, height: number) {
    this.p = p;
    this.width = width;
    this.height = height;
    this.generateRunes();
  }

  private generateRunes(): void {
    this.runes = [];
    const padding = 80;

    for (let i = 0; i < RUNE_COUNT; i++) {
      let x: number, y: number;
      let attempts = 0;
      do {
        x = this.p.random(padding, this.width - padding);
        y = this.p.random(padding, this.height - padding);
        attempts++;
      } while (this.hasOverlap(x, y, (MIN_RADIUS + MAX_RADIUS) / 2 + 20) && attempts < 100);

      const radius = this.p.random(MIN_RADIUS, MAX_RADIUS);
      const color = COLORS[Math.floor(this.p.random(COLORS.length))];

      this.runes.push({
        id: i,
        x,
        y,
        initialX: x,
        initialY: y,
        radius,
        color,
        rotation: this.p.random(this.p.TWO_PI),
        targetRotation: this.p.random(this.p.TWO_PI),
        scale: 1,
        pulsePhase: this.p.random(this.p.TWO_PI),
        isHovered: false,
        isConnected: false,
        isUnlocking: false,
        unlockProgress: 0,
        flashAlpha: 1,
        flashCount: 0,
        disappearProgress: 0,
        hasDisappeared: false,
      });
    }
  }

  private hasOverlap(x: number, y: number, minDist: number): boolean {
    for (const rune of this.runes) {
      const dx = rune.x - x;
      const dy = rune.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < minDist) return true;
    }
    return false;
  }

  getRunes(): RuneFragment[] {
    return this.runes.filter(r => !r.hasDisappeared);
  }

  getAllRunes(): RuneFragment[] {
    return this.runes;
  }

  getRuneAt(x: number, y: number): RuneFragment | null {
    for (const rune of this.runes) {
      if (rune.hasDisappeared) continue;
      const dx = rune.x - x;
      const dy = rune.y - y;
      const effectiveRadius = rune.radius * rune.scale * (rune.isHovered ? 1.2 : 1);
      if (Math.sqrt(dx * dx + dy * dy) < effectiveRadius) {
        return rune;
      }
    }
    return null;
  }

  setHover(x: number, y: number): RuneFragment | null {
    let hovered: RuneFragment | null = null;
    for (const rune of this.runes) {
      if (rune.hasDisappeared) continue;
      const dx = rune.x - x;
      const dy = rune.y - y;
      const effectiveRadius = rune.radius * 1.5;
      const isHovered = Math.sqrt(dx * dx + dy * dy) < effectiveRadius;
      rune.isHovered = isHovered;
      if (isHovered) hovered = rune;
    }
    return hovered;
  }

  update(dt: number, now: number): void {
    if (now - this.lastRotationChange > 2000 + this.p.random(1000)) {
      this.lastRotationChange = now;
      for (const rune of this.runes) {
        if (!rune.isUnlocking) {
          rune.targetRotation = rune.rotation + this.p.random(-5, 5) * (this.p.PI / 180);
        }
      }
    }

    for (const rune of this.runes) {
      if (rune.hasDisappeared) continue;

      rune.pulsePhase += dt * 2;
      const pulse = (PULSE_MIN + PULSE_MAX) / 2 +
        ((PULSE_MAX - PULSE_MIN) / 2) * Math.sin(rune.pulsePhase);
      rune.scale = rune.isHovered ? pulse * 1.2 : pulse;

      if (!rune.isUnlocking) {
        rune.rotation = this.lerpAngle(rune.rotation, rune.targetRotation, 0.05);
      }

      if (rune.isUnlocking) {
        rune.unlockProgress += dt;
        if (rune.unlockProgress < 0.9) {
          rune.flashCount = Math.floor(rune.unlockProgress / 0.15);
          rune.flashAlpha = (rune.flashCount % 2 === 0) ? 1 : 0.3;
        } else {
          rune.disappearProgress = (rune.unlockProgress - 0.9) / 0.6;
          if (rune.disappearProgress >= 1) {
            rune.hasDisappeared = true;
          }
        }
      }
    }

    this.updateParticles(dt);
    this.updateRipples(dt);
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > this.p.PI) diff -= this.p.TWO_PI;
    while (diff < -this.p.PI) diff += this.p.TWO_PI;
    return a + diff * t;
  }

  triggerUnlock(runeIds: number[], centerX: number, centerY: number): void {
    const unlockingRunes: RuneFragment[] = [];
    for (const rune of this.runes) {
      if (runeIds.includes(rune.id) && !rune.hasDisappeared) {
        rune.isUnlocking = true;
        rune.unlockProgress = 0;
        unlockingRunes.push(rune);
      }
    }

    setTimeout(() => {
      this.spawnParticles(centerX, centerY, unlockingRunes);
    }, 900);

    this.ripples.push({
      x: centerX,
      y: centerY,
      radius: 20,
      maxRadius: 120,
      alpha: 0.6,
      color: '#66ffcc',
      progress: 0,
    });
  }

  private spawnParticles(x: number, y: number, runes: RuneFragment[]): void {
    const count = Math.floor(this.p.random(30, 50));
    for (let i = 0; i < count; i++) {
      const rune = runes[Math.floor(this.p.random(runes.length))];
      const angle = this.p.random(this.p.TWO_PI);
      const speed = this.p.random(20, 80);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: rune.color,
        alpha: 1,
        life: 1.5,
        maxLife: 1.5,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateRipples(dt: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.progress += dt / 2;
      r.radius = 20 + (r.maxRadius - 20) * r.progress;
      r.alpha = 0.6 * (1 - r.progress);
      if (r.progress >= 1) {
        this.ripples.splice(i, 1);
      }
    }
  }

  reset(): void {
    this.particles = [];
    this.ripples = [];
    for (const rune of this.runes) {
      rune.x = rune.initialX;
      rune.y = rune.initialY;
      rune.rotation = this.p.random(this.p.TWO_PI);
      rune.targetRotation = this.p.random(this.p.TWO_PI);
      rune.isHovered = false;
      rune.isConnected = false;
      rune.isUnlocking = false;
      rune.unlockProgress = 0;
      rune.flashAlpha = 1;
      rune.flashCount = 0;
      rune.disappearProgress = 0;
      rune.hasDisappeared = false;
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  draw(): void {
    const p = this.p;

    for (const ripple of this.ripples) {
      p.noFill();
      p.stroke(p.color(ripple.color, Math.floor(ripple.alpha * 255)));
      p.strokeWeight(3);
      p.ellipse(ripple.x, ripple.y, ripple.radius * 2, ripple.radius * 2);
    }

    for (const rune of this.runes) {
      if (rune.hasDisappeared) continue;
      this.drawRune(rune);
    }

    for (const particle of this.particles) {
      p.noStroke();
      p.fill(p.color(particle.color, Math.floor(particle.alpha * 255)));
      p.ellipse(particle.x, particle.y, 4, 4);
    }
  }

  private drawRune(rune: RuneFragment): void {
    const p = this.p;
    p.push();
    p.translate(rune.x, rune.y);
    p.rotate(rune.rotation);

    const baseScale = rune.scale * (1 - rune.disappearProgress * 0.5);
    p.scale(baseScale);

    const alpha = rune.isUnlocking ? rune.flashAlpha : 0.9;
    const color = rune.isUnlocking && rune.flashCount % 2 === 0 ? '#ffffff' : rune.color;

    if (rune.isHovered || rune.isConnected) {
      p.drawingContext.shadowColor = rune.color;
      p.drawingContext.shadowBlur = rune.isHovered ? 20 : 10;
    }

    p.noStroke();
    p.fill(p.color(color, Math.floor(alpha * 255)));

    p.beginShape();
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60) * (p.PI / 180);
      const x = Math.cos(angle) * rune.radius;
      const y = Math.sin(angle) * rune.radius;
      p.vertex(x, y);
    }
    p.endShape(p.CLOSE);

    p.drawingContext.shadowBlur = 0;

    p.stroke(p.color('#ffffff', Math.floor(alpha * 180)));
    p.strokeWeight(1.5);
    p.noFill();
    for (let i = 0; i < 3; i++) {
      const r = rune.radius * (0.3 + i * 0.2);
      p.beginShape();
      for (let j = 0; j < 6; j++) {
        const angle = (j * 60 + i * 10) * (p.PI / 180);
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (j === 0) p.vertex(x, y);
        else p.vertex(x, y);
      }
      p.endShape(p.CLOSE);
    }

    p.pop();
  }

  getComplementaryColor(rune: RuneFragment): string {
    const hex = rune.color.replace('#', '');
    const r = 255 - parseInt(hex.substring(0, 2), 16);
    const g = 255 - parseInt(hex.substring(2, 4), 16);
    const b = 255 - parseInt(hex.substring(4, 6), 16);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  mixColors(c1: string, c2: string): string {
    const h1 = c1.replace('#', '');
    const h2 = c2.replace('#', '');
    const r = Math.floor((parseInt(h1.substring(0, 2), 16) + parseInt(h2.substring(0, 2), 16)) / 2);
    const g = Math.floor((parseInt(h1.substring(2, 4), 16) + parseInt(h2.substring(2, 4), 16)) / 2);
    const b = Math.floor((parseInt(h1.substring(4, 6), 16) + parseInt(h2.substring(4, 6), 16)) / 2);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}
