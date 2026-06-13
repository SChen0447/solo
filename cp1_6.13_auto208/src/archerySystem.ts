import type { MoonDisc } from './moonDisc';
import type { TrailPoint } from './visualEffects';

export interface Arrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  trail: TrailPoint[];
  active: boolean;
  id: number;
}

export interface HitEvent {
  discId: number;
  x: number;
  y: number;
  color: string;
}

export class ArcherySystem {
  private arrows: Arrow[] = [];
  private nextArrowId = 0;
  private isAiming = false;
  private aimStartX = 0;
  private aimStartY = 0;
  private aimCurrentX = 0;
  private aimCurrentY = 0;
  private gravity = 300;
  private arrowSpeed = 1000;
  private hitListeners: ((event: HitEvent) => void)[] = [];
  private missListeners: (() => void)[] = [];
  private audioContext: AudioContext | null = null;

  public onHit(listener: (event: HitEvent) => void): void {
    this.hitListeners.push(listener);
  }

  public onMiss(listener: () => void): void {
    this.missListeners.push(listener);
  }

  public startAim(x: number, y: number): void {
    this.isAiming = true;
    this.aimStartX = x;
    this.aimStartY = y;
    this.aimCurrentX = x;
    this.aimCurrentY = y;
  }

  public updateAim(x: number, y: number): void {
    if (!this.isAiming) return;
    this.aimCurrentX = x;
    this.aimCurrentY = y;
  }

  public releaseAim(): { launched: boolean; angle: number } {
    if (!this.isAiming) return { launched: false, angle: 0 };
    this.isAiming = false;
    const dx = this.aimStartX - this.aimCurrentX;
    const dy = this.aimStartY - this.aimCurrentY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 10) {
      return { launched: false, angle: 0 };
    }
    const angle = Math.atan2(dy, dx);
    this.launchArrow(this.aimStartX, this.aimStartY, angle);
    return { launched: true, angle };
  }

  public getAimState(): { active: boolean; startX: number; startY: number; currentX: number; currentY: number } {
    return {
      active: this.isAiming,
      startX: this.aimStartX,
      startY: this.aimStartY,
      currentX: this.aimCurrentX,
      currentY: this.aimCurrentY
    };
  }

  private launchArrow(x: number, y: number, angle: number): void {
    const arrow: Arrow = {
      id: this.nextArrowId++,
      x,
      y,
      vx: Math.cos(angle) * this.arrowSpeed,
      vy: Math.sin(angle) * this.arrowSpeed,
      angle,
      trail: [],
      active: true
    };
    this.arrows.push(arrow);
  }

  public update(dt: number, now: number, discs: MoonDisc[], viewportW: number, viewportH: number): void {
    this.arrows = this.arrows.filter(arrow => {
      if (!arrow.active) return false;
      arrow.vy += this.gravity * dt;
      arrow.x += arrow.vx * dt;
      arrow.y += arrow.vy * dt;
      arrow.angle = Math.atan2(arrow.vy, arrow.vx);
      arrow.trail.push({ x: arrow.x, y: arrow.y, time: now });
      for (const disc of discs) {
        if (!disc.active) continue;
        const dx = arrow.x - disc.x;
        const dy = arrow.y - disc.y;
        const r = disc.diameter / 2 + 3;
        if (dx * dx + dy * dy < r * r) {
          arrow.active = false;
          this.hitListeners.forEach(l => l({
            discId: disc.id,
            x: disc.x,
            y: disc.y,
            color: disc.color
          }));
          this.playHitSound();
          return false;
        }
      }
      if (arrow.x < -100 || arrow.x > viewportW + 100 || arrow.y > viewportH + 100) {
        this.missListeners.forEach(l => l());
        return false;
      }
      return true;
    });
  }

  public getArrows(): Arrow[] {
    return this.arrows.filter(a => a.active);
  }

  public consumeTrails(): TrailPoint[][] {
    const trails: TrailPoint[][] = [];
    this.arrows.forEach(arrow => {
      if (arrow.trail.length > 1) {
        trails.push([...arrow.trail]);
        arrow.trail = [arrow.trail[arrow.trail.length - 1]];
      }
    });
    return trails;
  }

  public playHitSound(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = this.audioContext;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.type = 'sine';
      const now = ctx.currentTime;
      oscillator.frequency.setValueAtTime(400, now);
      oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } catch (_) {
    }
  }
}
