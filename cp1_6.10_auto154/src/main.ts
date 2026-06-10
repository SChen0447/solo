import { Star, TrailPoint } from './star';
import { Constellation, CONSTELLATION_DATA, ChallengeTracker } from './constellation';
import { ParticleSystem } from './particle';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number;

  private stars: Star[] = [];
  private trails: TrailPoint[] = [];
  private particleSystem: ParticleSystem;

  private constellations: Constellation[] = [];
  private currentConstellationIndex: number = 0;

  private draggingStar: Star | null = null;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private lastTime: number = 0;
  private elapsedTime: number = 0;

  private frameCount: number = 0;
  private fpsTimer: number = 0;
  private currentFps: number = 60;

  private challengeTracker: ChallengeTracker;
  private rareUnlocked: boolean = false;

  private totalCollectedStars: number = 0;

  private starCountEl: HTMLElement;
  private progressFillEl: HTMLElement;
  private flashOverlay: HTMLElement;
  private legendCard: HTMLElement;
  private legendIcon: HTMLElement;
  private legendName: HTMLElement;
  private legendText: HTMLElement;
  private rareBadge: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;

    this.particleSystem = new ParticleSystem(800);
    this.challengeTracker = new ChallengeTracker();

    this.starCountEl = document.getElementById('starCountNum')!;
    this.progressFillEl = document.getElementById('progressFill')!;
    this.flashOverlay = document.getElementById('flashOverlay')!;
    this.legendCard = document.getElementById('legendCard')!;
    this.legendIcon = document.getElementById('legendIcon')!;
    this.legendName = document.getElementById('legendName')!;
    this.legendText = document.getElementById('legendText')!;
    this.rareBadge = document.getElementById('rareBadge')!;

    this.init();
  }

  private init(): void {
    this.resize();
    this.initConstellations();
    this.initStars();
    this.bindEvents();
    this.updateUI();
    this.lastTime = performance.now();
    this.loop();
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    for (const c of this.constellations) {
      c.resize(this.width, this.height);
    }
  }

  private initConstellations(): void {
    this.constellations = CONSTELLATION_DATA.map(
      (data) => new Constellation(data, this.width, this.height)
    );
  }

  private initStars(): void {
    this.stars = [];
    const starCount = 20 + Math.floor(Math.random() * 11);
    const padding = 60;

    for (let i = 0; i < starCount; i++) {
      let x: number, y: number;
      let attempts = 0;
      let valid = false;

      while (!valid && attempts < 50) {
        x = padding + Math.random() * (this.width - padding * 2);
        y = padding + Math.random() * (this.height - padding * 2);
        valid = true;

        for (const star of this.stars) {
          const dx = star.x - x;
          const dy = star.y - y;
          if (dx * dx + dy * dy < 1500) {
            valid = false;
            break;
          }
        }
        attempts++;
      }

      if (valid!) {
        this.stars.push(new Star(x!, y!));
      }
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());

    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', () => this.onMouseUp());

    const buttons = document.querySelectorAll('.constellation-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id') || '0');
        if (CONSTELLATION_DATA[id].isUnlocked) {
          this.switchConstellation(id);
        }
      });
    });

    document.getElementById('legendClose')?.addEventListener('click', () => {
      this.legendCard.classList.remove('visible');
    });
  }

  private getMousePos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const pos = this.getMousePos(e);
    this.startDrag(pos.x, pos.y);
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getMousePos(e);
    this.doDrag(pos.x, pos.y);
  }

  private onMouseUp(): void {
    this.endDrag();
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const pos = this.getMousePos(e.touches[0]);
      this.startDrag(pos.x, pos.y);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const pos = this.getMousePos(e.touches[0]);
      this.doDrag(pos.x, pos.y);
    }
  }

  private startDrag(x: number, y: number): void {
    this.lastMouseX = x;
    this.lastMouseY = y;

    for (let i = this.stars.length - 1; i >= 0; i--) {
      if (this.stars[i].isHit(x, y) && !this.stars[i].isPlaced) {
        this.draggingStar = this.stars[i];
        this.draggingStar.startDrag(x, y);
        this.isDragging = true;
        this.stars.splice(i, 1);
        this.stars.push(this.draggingStar);
        break;
      }
    }
  }

  private doDrag(x: number, y: number): void {
    this.lastMouseX = x;
    this.lastMouseY = y;

    if (this.isDragging && this.draggingStar) {
      this.draggingStar.drag(x, y);

      const lastTrail = this.trails[this.trails.length - 1];
      if (!lastTrail || Math.hypot(lastTrail.x - x, lastTrail.y - y) > 4) {
        this.trails.push(new TrailPoint(x, y));
      }
    }
  }

  private endDrag(): void {
    if (this.isDragging && this.draggingStar) {
      const constellation = this.constellations[this.currentConstellationIndex];
      const result = constellation.checkSnap(this.draggingStar.x, this.draggingStar.y);

      if (result.snapped) {
        this.draggingStar.snapToTarget(result.x, result.y, result.index);
        constellation.placeStar(result.index);
        this.totalCollectedStars++;

        const triggered = this.challengeTracker.recordPlacement();
        if (triggered) {
          this.triggerChallenge();
        }

        this.updateUI();

        if (constellation.isComplete()) {
          this.onConstellationComplete();
        }
      }

      this.draggingStar.stopDrag();
    }

    this.isDragging = false;
    this.draggingStar = null;
  }

  private onConstellationComplete(): void {
    const constellation = this.constellations[this.currentConstellationIndex];
    const center = constellation.getCenter();

    this.particleSystem.emitBurst(center.x, center.y, 80);

    setTimeout(() => {
      this.showLegendCard();
    }, 800);

    if (this.currentConstellationIndex < CONSTELLATION_DATA.length - 1) {
      CONSTELLATION_DATA[this.currentConstellationIndex + 1].isUnlocked = true;
      this.updateConstellationButtons();
    }
  }

  private triggerChallenge(): void {
    if (this.rareUnlocked) return;
    this.rareUnlocked = true;

    this.flashOverlay.classList.add('active');
    setTimeout(() => {
      this.flashOverlay.classList.remove('active');
    }, 50);

    const centerX = this.width / 2;
    const centerY = this.height / 2;
    this.particleSystem.emitNebula(centerX, centerY, 50);

    setTimeout(() => {
      this.rareBadge.classList.add('visible');
    }, 1500);
  }

  private showLegendCard(): void {
    const data = CONSTELLATION_DATA[this.currentConstellationIndex];
    this.legendIcon.textContent = data.icon;
    this.legendName.textContent = data.name;
    this.legendText.textContent = data.legend;
    this.legendCard.classList.add('visible');
  }

  private switchConstellation(index: number): void {
    this.currentConstellationIndex = index;
    this.challengeTracker.reset();

    for (const star of this.stars) {
      if (star.isPlaced) {
        this.constellations[index - 1 >= 0 ? index - 1 : 0];
        star.resetPosition();
      }
    }

    for (const c of this.constellations) {
      c.reset();
    }

    this.updateConstellationButtons();
    this.updateUI();
  }

  private updateConstellationButtons(): void {
    const buttons = document.querySelectorAll('.constellation-btn');
    buttons.forEach((btn, i) => {
      const isActive = i === this.currentConstellationIndex;
      const isUnlocked = CONSTELLATION_DATA[i].isUnlocked;

      btn.classList.toggle('active', isActive);
      btn.classList.toggle('locked', !isUnlocked);

      const badge = document.getElementById(`badge-${i}`);
      if (badge) {
        if (!isUnlocked) {
          badge.textContent = '锁定';
        } else if (this.constellations[i]?.isComplete()) {
          badge.textContent = '已完成';
        } else {
          badge.textContent = '进行中';
        }
      }
    });
  }

  private updateUI(): void {
    const constellation = this.constellations[this.currentConstellationIndex];
    this.starCountEl.textContent = this.totalCollectedStars.toString();
    const progress = Math.floor(constellation.getProgress() * 100);
    this.progressFillEl.style.width = `${progress}%`;
    this.updateConstellationButtons();
  }

  private updateFPS(deltaTime: number): void {
    this.frameCount++;
    this.fpsTimer += deltaTime;

    if (this.fpsTimer >= 2) {
      this.currentFps = this.frameCount / this.fpsTimer;
      this.frameCount = 0;
      this.fpsTimer = 0;

      if (this.currentFps < 45) {
        this.particleSystem.setParticleScale(0.5);
      } else {
        this.particleSystem.setParticleScale(1);
      }
    }
  }

  private update(deltaTime: number): void {
    this.elapsedTime += deltaTime;

    for (const star of this.stars) {
      star.update(deltaTime);
    }

    for (let i = this.trails.length - 1; i >= 0; i--) {
      const alive = this.trails[i].update(deltaTime);
      if (!alive) {
        this.trails.splice(i, 1);
      }
    }

    this.particleSystem.update(deltaTime);
    this.updateFPS(deltaTime);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      0,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.7
    );
    gradient.addColorStop(0, '#1a1d3a');
    gradient.addColorStop(1, '#0b0d17');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawEdgeGlow(): void {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      Math.min(this.width, this.height) * 0.4,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.75
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');

    this.ctx.save();
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();
  }

  private drawTrails(): void {
    for (let i = 0; i < this.trails.length; i++) {
      this.trails[i].draw(this.ctx, this.trails[i + 1]);
    }
  }

  private draw(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();

    const constellation = this.constellations[this.currentConstellationIndex];
    constellation.drawGuides(this.ctx);

    for (const star of this.stars) {
      star.draw(this.ctx);
    }

    constellation.drawCompletedLines(this.ctx, this.elapsedTime);

    this.drawTrails();

    this.particleSystem.draw(this.ctx);

    this.drawEdgeGlow();
  }

  private loop = (): void => {
    const now = performance.now();
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.update(deltaTime);
    this.draw();

    requestAnimationFrame(this.loop);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
