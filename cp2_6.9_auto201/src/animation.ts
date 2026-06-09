import { Gear } from './gear';

export interface FlashEffect {
  x: number;
  y: number;
  radius: number;
  startTime: number;
  duration: number;
}

export interface SteamParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface HintPulse {
  x: number;
  y: number;
  radius: number;
  startTime: number;
  duration: number;
}

export class AnimationManager {
  flashes: FlashEffect[];
  particles: SteamParticle[];
  hintPulse: HintPulse | null;
  doorOpen: boolean;
  steamActive: boolean;
  steamBurstTime: number;
  steamDuration: number;
  doorLeft: HTMLElement | null;
  doorRight: HTMLElement | null;
  doorMessage: HTMLElement | null;

  constructor() {
    this.flashes = [];
    this.particles = [];
    this.hintPulse = null;
    this.doorOpen = false;
    this.steamActive = false;
    this.steamBurstTime = 0;
    this.steamDuration = 1000;
    this.doorLeft = document.getElementById('door-left');
    this.doorRight = document.getElementById('door-right');
    this.doorMessage = document.getElementById('door-message');
  }

  addFlash(gear1: Gear, gear2: Gear, now: number): void {
    const midX = (gear1.x + gear2.x) / 2;
    const midY = (gear1.y + gear2.y) / 2;
    const radius = (gear1.radius + gear2.radius) * 0.5;
    this.flashes.push({
      x: midX,
      y: midY,
      radius,
      startTime: now,
      duration: 300
    });
  }

  triggerSteamBurst(centerX: number, centerY: number, now: number): void {
    this.steamActive = true;
    this.steamBurstTime = now;
    const particleCount = 60;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 80 + Math.random() * 160;
      const colors = ['#FF8C00', '#FFA500', '#FFD700', '#FF6347', '#FF4500'];
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        size: 3 + Math.random() * 6,
        life: 0.6 + Math.random() * 0.6,
        maxLife: 1.2,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  triggerHint(gear: Gear, now: number): void {
    this.hintPulse = {
      x: gear.x,
      y: gear.y,
      radius: gear.radius,
      startTime: now,
      duration: 2000
    };
  }

  openDoor(): void {
    if (this.doorOpen) return;
    this.doorOpen = true;
    if (this.doorLeft) this.doorLeft.classList.add('open');
    if (this.doorRight) this.doorRight.classList.add('open');
    setTimeout(() => {
      if (this.doorMessage) this.doorMessage.classList.add('show');
    }, 800);
  }

  closeDoor(): void {
    this.doorOpen = false;
    if (this.doorLeft) this.doorLeft.classList.remove('open');
    if (this.doorRight) this.doorRight.classList.remove('open');
    if (this.doorMessage) this.doorMessage.classList.remove('show');
  }

  update(dt: number, now: number): void {
    this.flashes = this.flashes.filter(f => now - f.startTime < f.duration);
    if (this.steamActive && now - this.steamBurstTime > this.steamDuration) {
      this.steamActive = false;
    }
    const alive: SteamParticle[] = [];
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life > 0) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 40 * dt;
        p.vx *= 0.98;
        alive.push(p);
      }
    }
    this.particles = alive;
    if (this.hintPulse && now - this.hintPulse.startTime > this.hintPulse.duration) {
      this.hintPulse = null;
    }
  }

  draw(ctx: CanvasRenderingContext2D, now: number): void {
    for (const flash of this.flashes) {
      const elapsed = now - flash.startTime;
      const progress = elapsed / flash.duration;
      const alpha = Math.max(0, 1 - progress);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(flash.x, flash.y, flash.radius * (0.8 + progress * 0.4), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (this.hintPulse) {
      const elapsed = now - this.hintPulse.startTime;
      const pulsePhase = (elapsed % 400) / 400;
      const pulseAlpha = Math.sin(pulsePhase * Math.PI);
      ctx.save();
      ctx.globalAlpha = pulseAlpha * 0.8;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3 + pulseAlpha * 3;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 20 + pulseAlpha * 15;
      ctx.beginPath();
      ctx.arc(
        this.hintPulse.x,
        this.hintPulse.y,
        this.hintPulse.radius * (1.1 + pulseAlpha * 0.2),
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  reset(): void {
    this.flashes = [];
    this.particles = [];
    this.hintPulse = null;
    this.steamActive = false;
    this.closeDoor();
  }
}
