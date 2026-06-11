import { BlackHole } from './BlackHole';
import { PlayerShip } from './PlayerShip';
import { PhysicsEngine } from './PhysicsEngine';
import { StarGate } from './StarGate';

interface Star {
  x: number;
  y: number;
  size: number;
  baseBrightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
  color: string;
}

interface ResetToast {
  active: boolean;
  alpha: number;
  progress: number;
  readonly DURATION: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  private blackHoles: BlackHole[] = [];
  private ship!: PlayerShip;
  private physics!: PhysicsEngine;
  private starGate!: StarGate;
  private stars: Star[] = [];

  private lastTime: number = 0;
  private animationFrameId: number = 0;

  private gatePassCount: number = 0;
  private readonly MAX_HOLE_COUNT: number = 7;

  private resetToast: ResetToast = {
    active: false,
    alpha: 0,
    progress: 0,
    DURATION: 1.5,
  };

  private resetCooldown: number = 0;
  private readonly RESET_COOLDOWN: number = 0.3;

  private speedEl!: HTMLElement | null;
  private gateCountEl!: HTMLElement | null;
  private holeCountEl!: HTMLElement | null;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx: CanvasRenderingContext2D | null = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;

    this.speedEl = document.getElementById('speedVal');
    this.gateCountEl = document.getElementById('gateCount');
    this.holeCountEl = document.getElementById('holeCount');

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.initStars();
    this.initLevel(false);

    this.starGate.setOnPassedCallback(() => this.onLevelCleared());

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private resize(): void {
    const dpr: number = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.resizeStars();
    if (this.starGate) {
      this.positionStarGate();
    }
    if (this.ship) {
      const initX: number = Math.max(80, this.width * 0.12);
      const initY: number = Math.max(80, this.height * 0.18);
      this.ship.setInitialPosition(initX, initY);
    }
    if (this.blackHoles.length > 0) {
      this.repositionBlackHoles();
    }
  }

  private initStars(): void {
    this.stars = [];
    const count: number = 200;
    const colors: string[] = [
      '#ffffff', '#ffeedd', '#ddeeff', '#ffffee', '#eeddff', '#ffffff',
    ];
    for (let i: number = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 0.4 + Math.random() * 1.8,
        baseBrightness: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 2.5,
        twinklePhase: Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  private resizeStars(): void {
    for (const s of this.stars) {
      if (s.x > this.width) s.x = Math.random() * this.width;
      if (s.y > this.height) s.y = Math.random() * this.height;
    }
  }

  private positionStarGate(): void {
    const pad: number = 110;
    const gx: number = this.width - pad;
    const gy: number = pad;
    if (this.starGate) {
      this.starGate.setPosition(gx, gy);
    }
  }

  private generateBlackHolePositions(count: number): { x: number; y: number; mass: number }[] {
    const result: { x: number; y: number; mass: number }[] = [];
    const minDist: number = 150;

    const shipX: number = Math.max(80, this.width * 0.12);
    const shipY: number = Math.max(80, this.height * 0.18);
    const gateX: number = this.width - 110;
    const gateY: number = 110;

    const margin: number = 120;
    const maxAttempts: number = 200;

    for (let i: number = 0; i < count; i++) {
      let placed: boolean = false;
      for (let attempt: number = 0; attempt < maxAttempts && !placed; attempt++) {
        const x: number = margin + Math.random() * (this.width - margin * 2);
        const y: number = margin + Math.random() * (this.height - margin * 2);

        const distToShip: number = Math.sqrt((x - shipX) ** 2 + (y - shipY) ** 2);
        const distToGate: number = Math.sqrt((x - gateX) ** 2 + (y - gateY) ** 2);
        if (distToShip < 180 || distToGate < 150) continue;

        let ok: boolean = true;
        for (const existing of result) {
          const d: number = Math.sqrt((x - existing.x) ** 2 + (y - existing.y) ** 2);
          if (d < minDist) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;

        const mass: number = 100 + Math.floor(Math.random() * 201);
        result.push({ x, y, mass });
        placed = true;
      }
      if (!placed && result.length === 0) {
        result.push({
          x: this.width * 0.5,
          y: this.height * 0.5,
          mass: 100 + Math.floor(Math.random() * 201),
        });
      }
    }
    return result;
  }

  private repositionBlackHoles(): void {
    const positions = this.generateBlackHolePositions(this.blackHoles.length);
    for (let i: number = 0; i < this.blackHoles.length && i < positions.length; i++) {
      this.blackHoles[i].x = positions[i].x;
      this.blackHoles[i].y = positions[i].y;
    }
  }

  private initLevel(isNext: boolean): void {
    let holeCount: number;
    if (isNext) {
      holeCount = Math.min(this.MAX_HOLE_COUNT, this.blackHoles.length + 1);
    } else {
      holeCount = 3 + Math.floor(Math.random() * 3);
    }

    const gateX: number = this.width - 110;
    const gateY: number = 110;
    if (!this.starGate) {
      this.starGate = new StarGate(gateX, gateY);
    } else {
      this.starGate.setPosition(gateX, gateY);
      this.starGate.resetState();
    }

    const positions = this.generateBlackHolePositions(holeCount);
    this.blackHoles = positions.map((p) => new BlackHole(p.x, p.y, p.mass));

    const shipX: number = Math.max(80, this.width * 0.12);
    const shipY: number = Math.max(80, this.height * 0.18);
    if (!this.ship) {
      this.ship = new PlayerShip(shipX, shipY);
    } else {
      this.ship.setInitialPosition(shipX, shipY);
      this.ship.reset();
    }

    if (!this.physics) {
      this.physics = new PhysicsEngine(this.blackHoles, this.ship);
    } else {
      this.physics.setBlackHoles(this.blackHoles);
    }
  }

  private onLevelCleared(): void {
    this.gatePassCount++;
    this.initLevel(true);
  }

  private triggerResetToast(): void {
    this.resetToast.active = true;
    this.resetToast.alpha = 0;
    this.resetToast.progress = 0;
  }

  private updateResetToast(deltaTime: number): void {
    if (!this.resetToast.active) return;
    this.resetToast.progress += deltaTime / this.resetToast.DURATION;
    const t: number = this.resetToast.progress;

    if (t < 0.2) {
      this.resetToast.alpha = t / 0.2;
    } else if (t > 0.7) {
      this.resetToast.alpha = Math.max(0, 1 - (t - 0.7) / 0.3);
    } else {
      this.resetToast.alpha = 1;
    }

    if (this.resetToast.progress >= 1) {
      this.resetToast.active = false;
      this.resetToast.alpha = 0;
      this.resetToast.progress = 0;
    }
  }

  private updateStars(deltaTime: number): void {
    for (const s of this.stars) {
      s.twinklePhase += s.twinkleSpeed * deltaTime;
    }
  }

  private update(deltaTime: number): void {
    this.resetCooldown = Math.max(0, this.resetCooldown - deltaTime);

    if (this.ship.isResetPressed() && this.resetCooldown <= 0 && !this.starGate.isClearing) {
      this.ship.consumeResetPress();
      this.ship.reset();
      this.triggerResetToast();
      this.resetCooldown = this.RESET_COOLDOWN;
    }

    for (const bh of this.blackHoles) {
      bh.update(deltaTime);
    }
    this.physics.update(deltaTime);
    this.starGate.update(deltaTime);
    this.starGate.checkPassed(this.ship);
    this.updateStars(deltaTime);
    this.updateResetToast(deltaTime);
    this.updateUI();
  }

  private updateUI(): void {
    if (this.speedEl) {
      this.speedEl.textContent = this.ship.getSpeed().toFixed(1);
    }
    if (this.gateCountEl) {
      this.gateCountEl.textContent = String(this.gatePassCount);
    }
    if (this.holeCountEl) {
      this.holeCountEl.textContent = String(this.blackHoles.length);
    }
  }

  private drawBackground(): void {
    const r0: number = Math.max(1, Math.min(this.width, this.height) * 0.1);
    const r1: number = Math.max(r0 + 1, Math.max(this.width, this.height) * 0.75);
    const gradient: CanvasGradient = this.ctx.createRadialGradient(
      this.width * 0.5,
      this.height * 0.45,
      r0,
      this.width * 0.5,
      this.height * 0.5,
      r1
    );
    gradient.addColorStop(0, '#0e0e3a');
    gradient.addColorStop(0.5, '#05051a');
    gradient.addColorStop(1, '#000000');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawStars(): void {
    for (const s of this.stars) {
      const brightness: number = s.baseBrightness * (0.6 + 0.4 * Math.sin(s.twinklePhase));
      this.ctx.save();
      this.ctx.globalAlpha = brightness;
      if (s.size > 1.2) {
        this.ctx.shadowColor = s.color;
        this.ctx.shadowBlur = s.size * 3;
      }
      this.ctx.fillStyle = s.color;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawResetToast(): void {
    if (!this.resetToast.active || this.resetToast.alpha <= 0) return;

    this.ctx.save();
    this.ctx.globalAlpha = this.resetToast.alpha;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const fontSize: number = 40;
    this.ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;

    const pulse: number = 1 + 0.05 * Math.sin(this.resetToast.progress * Math.PI * 8);
    const text: string = '重置成功';

    this.ctx.shadowColor = 'rgba(100, 220, 255, 0.9)';
    this.ctx.shadowBlur = 20 * pulse;
    this.ctx.fillStyle = '#bbf0ff';
    this.ctx.fillText(text, this.width * 0.5, this.height * 0.5);

    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = 'rgba(80, 180, 255, 0.8)';
    this.ctx.strokeText(text, this.width * 0.5, this.height * 0.5);

    this.ctx.restore();
  }

  private draw(): void {
    this.drawBackground();
    this.drawStars();

    for (const bh of this.blackHoles) {
      bh.draw(this.ctx);
    }

    this.starGate.draw(this.ctx);
    this.ship.draw(this.ctx);
    this.starGate.drawFlash(this.ctx, this.width, this.height);
    this.drawResetToast();
  }

  private loop = (currentTime: number): void => {
    let deltaTime: number = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    if (deltaTime > 0.05) deltaTime = 0.05;

    this.update(deltaTime);
    this.draw();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new Game();
  } catch (err) {
    console.error('游戏初始化失败:', err);
  }
});
