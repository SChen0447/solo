import { LevelManager } from './LevelManager';
import { Renderer, type Particle } from './Renderer';

class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private levelManager: LevelManager;
  private particles: Particle[] = [];
  private readonly maxParticles: number = 50;
  private readonly maxTrailLength: number = 40;
  private readonly particleSpeed: number = 420;

  private angle: number = 0;
  private frequency: number = 1000;
  private emitterRingRotation: number = 0;

  private animationId: number | null = null;
  private lastTime: number = 0;
  private targetFPS: number = 60;
  private frameTime: number = 1000 / this.targetFPS;
  private accumulator: number = 0;

  private gameStartTime: number = 0;
  private gameRunning: boolean = false;
  private victory: boolean = false;
  private elapsedTime: number = 0;

  private scale: number = 1;
  private isDragging: boolean = false;
  private dragStartAngle: number = 0;
  private dragStartX: number = 0;
  private dragStartY: number = 0;

  private angleSlider: HTMLInputElement;
  private freqSlider: HTMLInputElement;
  private fireBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private angleValue: HTMLSpanElement;
  private freqValue: HTMLSpanElement;
  private timerEl: HTMLSpanElement;
  private crystalCountEl: HTMLSpanElement;
  private victoryOverlay: HTMLDivElement;
  private finalTimeEl: HTMLSpanElement;
  private restartBtn: HTMLButtonElement;
  private fireworksContainer: HTMLDivElement;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new Renderer(this.canvas);
    this.levelManager = new LevelManager();

    this.angleSlider = document.getElementById('angle-slider') as HTMLInputElement;
    this.freqSlider = document.getElementById('freq-slider') as HTMLInputElement;
    this.fireBtn = document.getElementById('fire-btn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.angleValue = document.getElementById('angle-value') as HTMLSpanElement;
    this.freqValue = document.getElementById('freq-value') as HTMLSpanElement;
    this.timerEl = document.getElementById('timer') as HTMLSpanElement;
    this.crystalCountEl = document.getElementById('crystal-count') as HTMLSpanElement;
    this.victoryOverlay = document.getElementById('victory-overlay') as HTMLDivElement;
    this.finalTimeEl = document.getElementById('final-time') as HTMLSpanElement;
    this.restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;
    this.fireworksContainer = document.getElementById('fireworks') as HTMLDivElement;

    this.init();
  }

  private init(): void {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.setupEventListeners();
    this.startGame();
  }

  private resizeCanvas(): void {
    const bounds = this.levelManager.getBounds();
    const container = document.getElementById('game-container')!;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const isMobile = window.innerWidth < 768;
    const padding = isMobile ? 20 : 160;
    const topPadding = isMobile ? 140 : 40;
    const bottomPadding = isMobile ? 80 : 80;

    const availableWidth = containerWidth - padding;
    const availableHeight = containerHeight - topPadding - bottomPadding;

    const scaleX = availableWidth / bounds.width;
    const scaleY = availableHeight / bounds.height;
    this.scale = Math.min(scaleX, scaleY, 1);

    const canvasWidth = bounds.width * this.scale;
    const canvasHeight = bounds.height * this.scale;

    this.canvas.style.width = `${canvasWidth}px`;
    this.canvas.style.height = `${canvasHeight}px`;
    this.renderer.setSize(bounds.width, bounds.height);
  }

  private setupEventListeners(): void {
    this.angleSlider.addEventListener('input', (e) => {
      this.angle = parseInt((e.target as HTMLInputElement).value);
      this.updateUI();
    });

    this.freqSlider.addEventListener('input', (e) => {
      this.frequency = parseInt((e.target as HTMLInputElement).value);
      this.updateUI();
    });

    this.fireBtn.addEventListener('click', () => this.fireParticle());
    this.resetBtn.addEventListener('click', () => this.resetGame());
    this.restartBtn.addEventListener('click', () => {
      this.hideVictory();
      this.resetGame();
    });

    document.addEventListener('keydown', (e) => {
      if (this.victory) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          this.angle = (this.angle + 1 + 360) % 360;
          this.angleSlider.value = this.angle.toString();
          this.updateUI();
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.angle = (this.angle - 1 + 360) % 360;
          this.angleSlider.value = this.angle.toString();
          this.updateUI();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.frequency = Math.max(200, this.frequency - 10);
          this.freqSlider.value = this.frequency.toString();
          this.updateUI();
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.frequency = Math.min(2000, this.frequency + 10);
          this.freqSlider.value = this.frequency.toString();
          this.updateUI();
          break;
        case ' ':
          e.preventDefault();
          this.fireParticle();
          break;
      }
    });

    this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('mouseup', () => this.onPointerUp());
    this.canvas.addEventListener('mouseleave', () => this.onPointerUp());

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onPointerDown(touch);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.onPointerMove(touch);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onPointerUp();
    }, { passive: false });
  }

  private onPointerDown(e: MouseEvent | Touch): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / this.scale;
    const y = (e.clientY - rect.top) / this.scale;
    const emitter = this.levelManager.getEmitterPosition();
    const dx = x - emitter.x;
    const dy = y - emitter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 60) {
      this.isDragging = true;
      this.dragStartAngle = this.angle;
      this.dragStartX = x;
      this.dragStartY = y;
    }
  }

  private onPointerMove(e: MouseEvent | Touch): void {
    if (!this.isDragging) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / this.scale;
    const y = (e.clientY - rect.top) / this.scale;
    const emitter = this.levelManager.getEmitterPosition();

    const dx = x - emitter.x;
    const dy = y - emitter.y;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = (angle + 360) % 360;

    this.angle = Math.round(angle);
    this.angleSlider.value = this.angle.toString();
    this.updateUI();
  }

  private onPointerUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      if (window.innerWidth < 768) {
        this.fireParticle();
      }
    }
  }

  private startGame(): void {
    this.gameRunning = true;
    this.gameStartTime = performance.now();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop(): void {
    const now = performance.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    if (!this.victory) {
      this.accumulator += deltaTime;
      while (this.accumulator >= this.frameTime) {
        this.update(this.frameTime / 1000);
        this.accumulator -= this.frameTime;
      }
      this.elapsedTime = (now - this.gameStartTime) / 1000;
      this.updateTimerUI();
    }

    this.render();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number): void {
    this.emitterRingRotation += deltaTime * 2;

    this.levelManager.updateCrystalFlash(deltaTime);
    this.updateParticles(deltaTime);
    this.checkCollisions();
    this.checkVictory();
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (!p.active) continue;

      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > this.maxTrailLength) {
        p.trail.shift();
      }

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      const bounds = this.levelManager.getBounds();
      if (p.x < -50 || p.x > bounds.width + 50 || p.y < -50 || p.y > bounds.height + 50) {
        p.active = false;
      }
    }

    this.particles = this.particles.filter(p => p.active);
  }

  private checkCollisions(): void {
    const walls = this.levelManager.getWalls();
    const crystals = this.levelManager.getCrystals();

    for (const particle of this.particles) {
      if (!particle.active) continue;

      for (const wall of walls) {
        if (this.checkCircleRectCollision(particle, wall)) {
          this.handleWallReflection(particle, wall);
        }
      }

      for (let i = 0; i < crystals.length; i++) {
        const crystal = crystals[i];
        if (!crystal.collected) {
          const dx = particle.x - crystal.x;
          const dy = particle.y - crystal.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < particle.radius + crystal.radius) {
            this.levelManager.collectCrystal(i);
            this.crystalCountEl.textContent = this.levelManager.getCollectedCount().toString();
          }
        }
      }
    }
  }

  private checkCircleRectCollision(particle: Particle, rect: { x: number; y: number; width: number; height: number }): boolean {
    const closestX = Math.max(rect.x, Math.min(particle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(particle.y, rect.y + rect.height));

    const dx = particle.x - closestX;
    const dy = particle.y - closestY;

    return (dx * dx + dy * dy) < (particle.radius * particle.radius);
  }

  private handleWallReflection(particle: Particle, wall: { x: number; y: number; width: number; height: number }): void {
    const prevX = particle.x - particle.vx * 0.016;
    const prevY = particle.y - particle.vy * 0.016;

    const centerX = wall.x + wall.width / 2;
    const centerY = wall.y + wall.height / 2;

    const dx = particle.x - centerX;
    const dy = particle.y - centerY;

    if (particle.penetration > 0) {
      particle.penetration -= 1;
      return;
    }

    const overlapLeft = (particle.x + particle.radius) - wall.x;
    const overlapRight = (wall.x + wall.width) - (particle.x - particle.radius);
    const overlapTop = (particle.y + particle.radius) - wall.y;
    const overlapBottom = (wall.y + wall.height) - (particle.y - particle.radius);

    const minOverlapX = Math.min(overlapLeft, overlapRight);
    const minOverlapY = Math.min(overlapTop, overlapBottom);

    if (minOverlapX < minOverlapY) {
      particle.vx = -particle.vx;
      if (overlapLeft < overlapRight) {
        particle.x = wall.x - particle.radius - 0.1;
      } else {
        particle.x = wall.x + wall.width + particle.radius + 0.1;
      }
    } else {
      particle.vy = -particle.vy;
      if (overlapTop < overlapBottom) {
        particle.y = wall.y - particle.radius - 0.1;
      } else {
        particle.y = wall.y + wall.height + particle.radius + 0.1;
      }
    }
  }

  private fireParticle(): void {
    if (this.particles.length >= this.maxParticles || this.victory) return;

    const emitter = this.levelManager.getEmitterPosition();
    const color = this.renderer.getFrequencyColor(this.frequency);
    const radius = this.getParticleRadius();
    const speed = this.particleSpeed;
    const angleRad = (this.angle * Math.PI) / 180;

    const penetration = this.getPenetration();

    const particle: Particle = {
      x: emitter.x + Math.cos(angleRad) * 30,
      y: emitter.y + Math.sin(angleRad) * 30,
      vx: Math.cos(angleRad) * speed,
      vy: Math.sin(angleRad) * speed,
      radius,
      color,
      trail: [],
      active: true,
      penetration
    };

    this.particles.push(particle);
  }

  private getParticleRadius(): number {
    const t = (this.frequency - 200) / (2000 - 200);
    return 7 - t * 4;
  }

  private getPenetration(): number {
    const t = (this.frequency - 200) / (2000 - 200);
    return Math.floor(t * 5);
  }

  private checkVictory(): void {
    if (this.levelManager.checkVictory() && !this.victory) {
      this.victory = true;
      this.gameRunning = false;
      this.showVictory();
    }
  }

  private showVictory(): void {
    this.finalTimeEl.textContent = this.formatTime(this.elapsedTime);
    this.victoryOverlay.classList.add('active');
    this.createFireworks();
  }

  private hideVictory(): void {
    this.victoryOverlay.classList.remove('active');
    this.fireworksContainer.innerHTML = '';
  }

  private createFireworks(): void {
    const colors = ['#FF4136', '#FF851B', '#FFDC00', '#2ECC40', '#0074D9', '#B10DC9', '#39CCCC'];
    const particleCount = 200;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'firework-particle';

      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3;
      const velocity = 150 + Math.random() * 250;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity - 100;

      particle.style.setProperty('--tx', `${tx}px`);
      particle.style.setProperty('--ty', `${ty}px`);
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      particle.style.animation = `firework ${1.5 + Math.random() * 0.5}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`;
      particle.style.animationDelay = `${Math.random() * 0.3}s`;
      particle.style.boxShadow = `0 0 10px ${particle.style.backgroundColor}`;

      this.fireworksContainer.appendChild(particle);
    }
  }

  private resetGame(): void {
    this.levelManager.resetLevel();
    this.particles = [];
    this.victory = false;
    this.gameRunning = true;
    this.gameStartTime = performance.now();
    this.elapsedTime = 0;
    this.angle = 0;
    this.frequency = 1000;
    this.angleSlider.value = '0';
    this.freqSlider.value = '1000';
    this.crystalCountEl.textContent = '0';
    this.updateUI();
  }

  private updateUI(): void {
    this.angleValue.textContent = `${this.angle}°`;
    this.freqValue.textContent = `${this.frequency}Hz`;
  }

  private updateTimerUI(): void {
    this.timerEl.textContent = this.formatTime(this.elapsedTime);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  private render(): void {
    const emitter = this.levelManager.getEmitterPosition();
    const levelData = this.levelManager.getLevelData();

    this.renderer.render({
      walls: levelData.walls,
      crystals: levelData.crystals,
      particles: this.particles,
      emitter: {
        x: emitter.x,
        y: emitter.y,
        radius: 20,
        angle: this.angle,
        ringRotation: this.emitterRingRotation
      },
      frequency: this.frequency,
      scale: this.scale
    });
  }
}

new GameEngine();
