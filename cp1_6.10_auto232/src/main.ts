import { Particle, TrailParticle, Star, Obstacle, CelebrationParticle, THEMES, ThemeColors, Vec2 } from './particle';
import { Renderer, GameState } from './renderer';

const MAX_SCORE = 10;
const STAR_COUNT = 300;
const BASE_BIRD_PARTICLES = 100;
const MIN_BIRD_PARTICLES = 60;
const BIRD_FOLLOW_DELAY = 0.3;

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private state: GameState;
  private lastTime: number = 0;
  private elapsedTime: number = 0;
  private obstacleTimer: number = 0;
  private nextObstacleTime: number = 0;
  private trailTimer: number = 0;
  private scoreTimer: number = 0;
  private mouseHistory: { x: number; y: number; time: number }[] = [];
  private running: boolean = false;

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas not found');
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.state = this.createInitialState();
    this.bindEvents();
  }

  private createInitialState(): GameState {
    const width = this.renderer.getWidth();
    const height = this.renderer.getHeight();
    const centerX = width / 2;
    const centerY = height / 2;

    const birdParticles: Particle[] = [];
    const birdColors = THEMES.neon.bird;
    for (let i = 0; i < BASE_BIRD_PARTICLES; i++) {
      const color = birdColors[i % birdColors.length];
      const radius = 3 + Math.random() * 3;
      const p = new Particle(centerX, centerY, color, false, radius);
      birdParticles.push(p);
    }

    const stars: Star[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push(new Star(width, height));
    }

    return {
      birdParticles,
      trailParticles: [],
      stars,
      obstacles: [],
      celebrationParticles: [],
      birdCenter: { x: centerX, y: centerY },
      birdTarget: { x: centerX, y: centerY },
      mousePos: { x: centerX, y: centerY },
      score: 0,
      maxScore: MAX_SCORE,
      isExploding: false,
      isReassembling: false,
      goldTrailTimer: 0,
      showTrail: true,
      currentTheme: THEMES.neon,
      survivalTime: 0,
      pulsePhase: 0
    };
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.state.mousePos.x = e.clientX - rect.left;
      this.state.mousePos.y = e.clientY - rect.top;
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.state.mousePos.x = touch.clientX - rect.left;
      this.state.mousePos.y = touch.clientY - rect.top;
    }, { passive: false });
  }

  private syncBirdParticleCount(): void {
    const targetCount = this.renderer.getParticleCount();
    const current = this.state.birdParticles;

    if (current.length < targetCount) {
      const birdColors = this.state.currentTheme.bird;
      for (let i = current.length; i < targetCount; i++) {
        const color = birdColors[i % birdColors.length];
        const radius = 3 + Math.random() * 3;
        const p = new Particle(this.state.birdCenter.x, this.state.birdCenter.y, color, false, radius);
        current.push(p);
      }
    } else if (current.length > targetCount) {
      current.length = targetCount;
    }
  }

  private updateBirdTarget(dt: number): void {
    this.mouseHistory.push({
      x: this.state.mousePos.x,
      y: this.state.mousePos.y,
      time: this.elapsedTime
    });

    while (this.mouseHistory.length > 0 &&
           this.elapsedTime - this.mouseHistory[0].time > BIRD_FOLLOW_DELAY) {
      this.mouseHistory.shift();
    }

    if (this.mouseHistory.length > 0) {
      const oldest = this.mouseHistory[0];
      this.state.birdTarget.x += (oldest.x - this.state.birdTarget.x) * 0.1;
      this.state.birdTarget.y += (oldest.y - this.state.birdTarget.y) * 0.1;
    }

    if (!this.state.isExploding && !this.state.isReassembling) {
      this.state.birdCenter.x += (this.state.birdTarget.x - this.state.birdCenter.x) * 0.05;
      this.state.birdCenter.y += (this.state.birdTarget.y - this.state.birdCenter.y) * 0.05;
    }
  }

  private updateBirdParticles(dt: number): void {
    for (const p of this.state.birdParticles) {
      if (this.state.isReassembling) {
        p.update(dt, undefined, this.state.birdCenter);
      } else {
        p.update(dt, this.state.birdTarget, this.state.birdCenter);
      }
    }

    if (this.state.isReassembling) {
      const allReassembled = this.state.birdParticles.every(p => !p.reassembling && !p.exploding);
      if (allReassembled) {
        this.state.isReassembling = false;
      }
    }
  }

  private updateTrailParticles(dt: number): void {
    this.trailTimer += dt;
    const emitInterval = 0.02;

    if (this.state.showTrail && this.trailTimer >= emitInterval &&
        !this.state.isExploding && !this.state.isReassembling) {
      this.trailTimer = 0;
      const trailColors = this.state.goldTrailTimer > 0
        ? [this.state.currentTheme.goldTrail]
        : this.state.currentTheme.trail;
      for (let i = 0; i < 3; i++) {
        const color = trailColors[Math.floor(Math.random() * trailColors.length)];
        const offsetX = (Math.random() - 0.5) * 30;
        const offsetY = (Math.random() - 0.5) * 30;
        this.state.trailParticles.push(new TrailParticle(
          this.state.birdCenter.x + offsetX,
          this.state.birdCenter.y + offsetY,
          color
        ));
      }
    }

    this.state.trailParticles = this.state.trailParticles.filter(p => {
      p.update(dt);
      return p.life < p.maxLife;
    });

    if (this.state.goldTrailTimer > 0) {
      this.state.goldTrailTimer -= dt;
    }
  }

  private updateObstacles(dt: number): void {
    this.obstacleTimer += dt;
    if (this.obstacleTimer >= this.nextObstacleTime) {
      this.obstacleTimer = 0;
      this.nextObstacleTime = 3 + Math.random() * 2;
      this.state.obstacles.push(new Obstacle(
        this.renderer.getWidth(),
        this.renderer.getHeight(),
        this.state.currentTheme.obstacle
      ));
    }

    this.state.obstacles = this.state.obstacles.filter(obs => {
      obs.update(dt, this.renderer.getWidth(), this.renderer.getHeight());
      return !obs.isExpired();
    });

    if (!this.state.isExploding && !this.state.isReassembling) {
      for (const obs of this.state.obstacles) {
        if (obs.collidesWith(this.state.birdCenter.x, this.state.birdCenter.y)) {
          this.explodeBird();
          break;
        }
      }
    }
  }

  private explodeBird(): void {
    this.state.isExploding = true;
    this.state.isReassembling = false;
    for (const p of this.state.birdParticles) {
      p.explode();
    }
    setTimeout(() => {
      this.state.isExploding = false;
      this.state.isReassembling = true;
      this.state.goldTrailTimer = 3;
    }, 800);
  }

  private updateCelebrationParticles(dt: number): void {
    this.state.celebrationParticles = this.state.celebrationParticles.filter(p => {
      p.update(dt);
      return !p.isExpired();
    });
  }

  private updateScore(dt: number): void {
    if (this.state.isExploding || this.state.isReassembling) {
      this.scoreTimer = 0;
      return;
    }

    this.state.survivalTime += dt;
    this.scoreTimer += dt;

    if (this.scoreTimer >= 10) {
      this.scoreTimer = 0;
      this.state.score++;
      if (this.state.score >= this.state.maxScore) {
        this.triggerCelebration();
        this.state.score = 0;
      }
    }
  }

  private triggerCelebration(): void {
    for (let i = 0; i < 150; i++) {
      this.state.celebrationParticles.push(new CelebrationParticle(
        this.renderer.getWidth(),
        this.renderer.getHeight()
      ));
    }
  }

  private toggleTrail(): void {
    this.state.showTrail = !this.state.showTrail;
  }

  private selectTheme(key: string): void {
    if (THEMES[key]) {
      this.state.currentTheme = THEMES[key];
      const birdColors = THEMES[key].bird;
      this.state.birdParticles.forEach((p, i) => {
        if (!p.exploding && !p.reassembling) {
          p.color = birdColors[i % birdColors.length];
        }
      });
    }
  }

  private resetGame(): void {
    const newState = this.createInitialState();
    newState.showTrail = this.state.showTrail;
    newState.currentTheme = this.state.currentTheme;
    const birdColors = this.state.currentTheme.bird;
    newState.birdParticles.forEach((p, i) => {
      p.color = birdColors[i % birdColors.length];
    });
    this.state = newState;
    this.mouseHistory = [];
    this.obstacleTimer = 0;
    this.nextObstacleTime = 3 + Math.random() * 2;
    this.scoreTimer = 0;
    this.trailTimer = 0;
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return;

    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;
    this.elapsedTime += dt;

    this.syncBirdParticleCount();
    this.updateBirdTarget(dt);
    this.updateBirdParticles(dt);
    this.updateTrailParticles(dt);
    this.updateObstacles(dt);
    this.updateCelebrationParticles(dt);
    this.updateScore(dt);

    this.state.pulsePhase += dt * (Math.PI * 2 / 0.7);

    this.renderer.updateFps(dt);

    const allThemes = Object.entries(THEMES).map(([key, theme]) => ({ key, theme }));
    this.renderer.render(this.state, this.elapsedTime, allThemes, {
      onToggleTrail: () => this.toggleTrail(),
      onSelectTheme: (key: string) => this.selectTheme(key),
      onReset: () => this.resetGame()
    });

    requestAnimationFrame(this.loop);
  }

  start(): void {
    this.running = true;
    this.lastTime = 0;
    requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
