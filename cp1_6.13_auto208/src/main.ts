import { ArcherySystem } from './archerySystem';
import { MoonDiscSystem } from './moonDisc';
import { VisualEffects } from './visualEffects';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private archery: ArcherySystem;
  private discs: MoonDiscSystem;
  private effects: VisualEffects;
  private viewportW = 0;
  private viewportH = 0;
  private centerX = 0;
  private centerY = 0;
  private arenaRadius = 0;
  private lastTime = 0;
  private comboCount = 0;
  private flashOverlay: HTMLElement | null = null;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.archery = new ArcherySystem();
    this.discs = new MoonDiscSystem();
    this.effects = new VisualEffects(this.ctx);
    this.flashOverlay = document.getElementById('flashOverlay');
    this.setupCanvas();
    this.setupEvents();
    this.initSystems();
    this.setupHitHandlers();
    requestAnimationFrame(this.loop.bind(this));
  }

  private setupCanvas(): void {
    this.viewportW = window.innerWidth;
    this.viewportH = window.innerHeight;
    this.canvas.width = this.viewportW * window.devicePixelRatio;
    this.canvas.height = this.viewportH * window.devicePixelRatio;
    this.canvas.style.width = this.viewportW + 'px';
    this.canvas.style.height = this.viewportH + 'px';
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.centerX = this.viewportW / 2;
    this.centerY = this.viewportH / 2;
    this.arenaRadius = this.computeArenaRadius();
  }

  private computeArenaRadius(): number {
    const fromHeight = this.viewportH * 0.3;
    const minRadius = this.viewportW <= 480 ? 180 : 200;
    return Math.max(fromHeight, minRadius);
  }

  private initSystems(): void {
    this.discs.init(this.centerX, this.centerY, this.arenaRadius, this.viewportW);
  }

  private setupEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  private onResize(): void {
    this.setupCanvas();
    this.discs.updateSizes(this.viewportW);
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 2) {
      this.tryTriggerCrescentSlash();
      return;
    }
    if (e.button !== 0) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (this.isInsideArena(x, y)) {
      this.archery.startAim(x, y);
      this.canvas.classList.add('aiming');
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.archery.updateAim(x, y);
  }

  private onMouseUp(_e: MouseEvent): void {
    const result = this.archery.releaseAim();
    this.canvas.classList.remove('aiming');
    if (result.launched) {
      this.triggerShake();
    }
  }

  private isInsideArena(x: number, y: number): boolean {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    return dx * dx + dy * dy <= this.arenaRadius * this.arenaRadius;
  }

  private setupHitHandlers(): void {
    this.archery.onHit((event) => {
      const disc = this.discs.shatterDisc(event.discId);
      if (disc) {
        this.effects.spawnShatterParticles(event.x, event.y, event.color, 20);
        this.comboCount++;
        if (this.comboCount % 5 === 0) {
          this.effects.addEnergyStar(this.centerX, this.centerY);
          if (this.effects.getEnergyStarCount() >= 3) {
            this.effects.triggerCornerHalos();
          }
        }
      }
    });
    this.archery.onMiss(() => {
      this.comboCount = 0;
    });
  }

  private tryTriggerCrescentSlash(): void {
    if (this.effects.getEnergyStarCount() >= 3 && !this.effects.isCrescentSlashActive()) {
      this.effects.triggerCrescentSlash();
      this.effects.clearEnergyStars();
      this.comboCount = 0;
      this.flashBackground();
      setTimeout(() => {
        const shattered = this.discs.shatterAllDiscs(5);
        shattered.forEach(d => {
          this.effects.spawnShatterParticles(d.x, d.y, d.color, 20);
        });
      }, 300);
    }
  }

  private flashBackground(): void {
    if (this.flashOverlay) {
      this.flashOverlay.classList.add('active');
      setTimeout(() => {
        this.flashOverlay?.classList.remove('active');
      }, 200);
    }
  }

  private triggerShake(): void {
    this.canvas.classList.remove('shake');
    void this.canvas.offsetWidth;
    this.canvas.classList.add('shake');
    setTimeout(() => {
      this.canvas.classList.remove('shake');
    }, 100);
  }

  private loop(now: number): void {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000 || 0);
    this.lastTime = now;
    this.update(dt, now);
    this.render(now);
    requestAnimationFrame(this.loop.bind(this));
  }

  private update(dt: number, now: number): void {
    this.discs.update(dt);
    this.archery.update(dt, now, this.discs.getActiveDiscs(), this.viewportW, this.viewportH);
    this.effects.update(dt, now, this.viewportW, this.viewportH);
    const trails = this.archery.consumeTrails();
    trails.forEach(t => this.effects.addTrail(t));
  }

  private render(now: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.viewportW, this.viewportH);
    this.renderStars();
    this.discs.renderArenaFence(ctx, this.centerX, this.centerY, this.arenaRadius);
    this.discs.render(ctx);
    this.effects.render(now, this.viewportW, this.viewportH, this.centerX, this.centerY);
    const aimState = this.archery.getAimState();
    if (aimState.active) {
      this.effects.renderAiming(aimState.startX, aimState.startY, aimState.currentX, aimState.currentY, now);
    }
    this.archery.getArrows().forEach(arrow => {
      this.effects.renderArrow(arrow.x, arrow.y, arrow.angle);
    });
  }

  private renderStars(): void {
    const ctx = this.ctx;
    const seed = 12345;
    const count = 150;
    for (let i = 0; i < count; i++) {
      const pseudo = Math.sin(i * seed) * 10000;
      const x = (pseudo - Math.floor(pseudo)) * this.viewportW;
      const pseudo2 = Math.sin(i * seed * 2) * 10000;
      const y = (pseudo2 - Math.floor(pseudo2)) * this.viewportH;
      const pseudo3 = Math.sin(i * seed * 3) * 10000;
      const size = 0.5 + (pseudo3 - Math.floor(pseudo3)) * 1.5;
      const pseudo4 = Math.sin(i * seed * 4 + performance.now() / 2000) * 0.5 + 0.5;
      ctx.save();
      ctx.globalAlpha = 0.3 + pseudo4 * 0.4;
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
