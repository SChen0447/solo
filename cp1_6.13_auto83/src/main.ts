import { Maze, type HexCoord } from './maze';
import { Particle, type Ripple, type EnergyWave } from './particle';
import { Renderer, type RenderState } from './renderer';

class AudioManager {
  private audioContext: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  public playToggleSound(): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(440, now + 0.1);

      const osc2 = ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(1320, now);
      osc2.frequency.exponentialRampToValueAtTime(660, now + 0.1);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.15);
      osc2.stop(now + 0.15);
    } catch (e) {
      console.log('Audio not available');
    }
  }

  public playVictoryMelody(): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50];
      const noteDuration = 0.3;

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * noteDuration);

        const gain = ctx.createGain();
        const startGain = 0.1 * (1 + i * 0.15);
        gain.gain.setValueAtTime(0, now + i * noteDuration);
        gain.gain.linearRampToValueAtTime(startGain, now + i * noteDuration + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * noteDuration + noteDuration * 0.9);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * noteDuration);
        osc.stop(now + i * noteDuration + noteDuration);
      });
    } catch (e) {
      console.log('Audio not available');
    }
  }

  public playLevelComplete(): void {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99];

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.15);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12, now + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.2);
      });
    } catch (e) {
      console.log('Audio not available');
    }
  }
}

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private audioManager: AudioManager;

  private maze!: Maze;
  private particles: Particle[] = [];
  private ripples: Ripple[] = [];
  private energyWaves: EnergyWave[] = [];

  private currentLevel: number = 1;
  private totalLevels: number = 5;
  private steps: number = 0;

  private isVictory: boolean = false;
  private victoryTime: number = 0;
  private isLevelComplete: boolean = false;
  private levelCompleteTime: number = 0;
  private levelTransitionDelay: number = 1.5;

  private hoverReset: boolean = false;
  private resetRotation: number = 0;

  private lastTime: number = 0;
  private isDragging: boolean = false;
  private dragStartCoord: HexCoord | null = null;

  private _animationId: number = 0;
  private gameTime: number = 0;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new Renderer(this.canvas);
    this.audioManager = new AudioManager();

    this.init();
  }

  private init(): void {
    this.setupLevel(this.currentLevel);
    this.bindEvents();
    this.hideLoading();
    this.startGameLoop();
  }

  private hideLoading(): void {
    setTimeout(() => {
      const loading = document.getElementById('loading-particle');
      if (loading) {
        loading.classList.add('hidden');
      }
    }, 800);
  }

  private setupLevel(level: number): void {
    this.maze = new Maze(level);
    this.particles = [];
    this.ripples = [];
    this.energyWaves = [];
    this.steps = 0;
    this.isLevelComplete = false;

    const startPos = this.maze.getStartPosition();
    const mainParticle = new Particle(startPos, 'low', true);
    this.particles.push(mainParticle);

    const particleCount = this.maze.targetCount - 1;
    const nonTargetNodes = this.maze.getNonTargetNodes().filter(
      (node) => !(node.coord.q === startPos.q && node.coord.r === startPos.r)
    );
    const shuffled = nonTargetNodes.sort(() => Math.random() - 0.5);

    for (let i = 0; i < particleCount && i < shuffled.length; i++) {
      const particle = new Particle(shuffled[i].coord, 'low', false);
      this.particles.push(particle);
    }

    this.checkParticleTargets();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('resize', () => this.handleResize());

    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());

    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
  }

  private handleResize(): void {
    this.renderer.resize();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.isVictory || this.isLevelComplete) return;

    const mainParticle = this.getMainParticle();
    if (!mainParticle || mainParticle.isMoving) return;

    const current = mainParticle.coord;
    let target: HexCoord | null = null;

    switch (e.key) {
      case 'ArrowRight':
      case 'd':
      case 'D':
        target = { q: current.q + 1, r: current.r };
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        target = { q: current.q - 1, r: current.r };
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
        target = { q: current.q, r: current.r - 1 };
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        target = { q: current.q, r: current.r + 1 };
        break;
      case 'q':
      case 'Q':
        target = { q: current.q - 1, r: current.r + 1 };
        break;
      case 'e':
      case 'E':
        target = { q: current.q + 1, r: current.r - 1 };
        break;
      case 'r':
      case 'R':
        this.resetLevel();
        return;
      default:
        return;
    }

    if (target && this.maze.getNode(target)) {
      e.preventDefault();
      this.moveMainParticle(target);
    }
  }

  private getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private handleMouseDown(e: MouseEvent): void {
    const coords = this.getCanvasCoords(e);

    if (this.renderer.isPointInResetButton(coords.x, coords.y)) {
      this.resetLevel();
      return;
    }

    if (this.isVictory || this.isLevelComplete) return;

    const mainParticle = this.getMainParticle();
    if (!mainParticle || mainParticle.isMoving) return;

    this.isDragging = true;
    this.dragStartCoord = { ...mainParticle.coord };
  }

  private handleMouseMove(e: MouseEvent): void {
    const coords = this.getCanvasCoords(e);
    this.hoverReset = this.renderer.isPointInResetButton(coords.x, coords.y);

    if (!this.isDragging || !this.dragStartCoord) return;

    const mainParticle = this.getMainParticle();
    if (!mainParticle || mainParticle.isMoving) return;

    const { centerX, centerY } = this.getCenter();
    const hexCoord = this.maze.pixelToHex(coords.x, coords.y, centerX, centerY);

    if (this.maze.isAdjacent(this.dragStartCoord, hexCoord) && this.maze.getNode(hexCoord)) {
      this.moveMainParticle(hexCoord);
      this.isDragging = false;
      this.dragStartCoord = null;
    }
  }

  private handleMouseUp(_e: MouseEvent): void {
    this.isDragging = false;
    this.dragStartCoord = null;
  }

  private handleMouseLeave(): void {
    this.isDragging = false;
    this.dragStartCoord = null;
    this.hoverReset = false;
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    this.handleMouseUp({} as MouseEvent);
  }

  private getCenter(): { centerX: number; centerY: number } {
    const size = this.renderer.getCanvasSize();
    return { centerX: size.width / 2, centerY: size.height / 2 };
  }

  private getMainParticle(): Particle | undefined {
    return this.particles.find((p) => p.isMain);
  }

  private moveMainParticle(targetCoord: HexCoord): void {
    const mainParticle = this.getMainParticle();
    if (!mainParticle || mainParticle.isMoving) return;

    const fromCoord = { ...mainParticle.coord };
    mainParticle.startMove(targetCoord);
    this.steps++;

    this.maze.setEdgeBrightness(fromCoord, targetCoord, 0.8);

    this.toggleAdjacentParticles(targetCoord);

    setTimeout(() => {
      this.checkParticleTargets();
      this.checkWinCondition();
    }, 300);
  }

  private toggleAdjacentParticles(centerCoord: HexCoord): void {
    const neighbors = this.maze.getNeighbors(centerCoord);
    const mainParticle = this.getMainParticle();

    neighbors.forEach((neighborCoord) => {
      const particle = this.particles.find(
        (p) => !p.isMain && p.coord.q === neighborCoord.q && p.coord.r === neighborCoord.r && !p.isMoving
      );

      if (particle) {
        particle.toggleEnergyLevel();
        this.audioManager.playToggleSound();
        this.createRipple(neighborCoord);
      }
    });

    if (mainParticle) {
      mainParticle.toggleEnergyLevel();
      this.audioManager.playToggleSound();
      this.createRipple(centerCoord);
    }
  }

  private createRipple(coord: HexCoord): void {
    const { centerX, centerY } = this.getCenter();
    const pixel = this.maze.hexToPixel(coord, centerX, centerY);

    const ripple: Ripple = {
      x: pixel.x,
      y: pixel.y,
      radius: 0,
      maxRadius: 30,
      startTime: this.gameTime,
      duration: 0.5,
      colorStart: '#4ade80',
      colorEnd: '#c084fc',
    };

    this.ripples.push(ripple);
  }

  private checkParticleTargets(): void {
    const targetNodes = this.maze.getTargetNodes();

    this.particles.forEach((particle) => {
      if (particle.isMoving) return;

      const isOnTarget = targetNodes.some(
        (node) => node.coord.q === particle.coord.q && node.coord.r === particle.coord.r
      );

      if (isOnTarget && !particle.isOnTarget) {
        particle.isOnTarget = true;
        particle.energyLevel = 'high';
        this.createEnergyWave(particle.coord);
      } else if (!isOnTarget && particle.isOnTarget) {
        particle.isOnTarget = false;
      }
    });
  }

  private createEnergyWave(coord: HexCoord): void {
    const { centerX, centerY } = this.getCenter();
    const pixel = this.maze.hexToPixel(coord, centerX, centerY);

    const wave: EnergyWave = {
      x: pixel.x,
      y: pixel.y,
      radius: 0,
      maxRadius: 60,
      startTime: this.gameTime,
      duration: 0.8,
    };

    this.energyWaves.push(wave);
  }

  private checkWinCondition(): void {
    const allOnTarget = this.particles.every((p) => p.isOnTarget && !p.isMoving);

    if (allOnTarget && !this.isLevelComplete) {
      this.isLevelComplete = true;
      this.levelCompleteTime = this.gameTime;
      this.audioManager.playLevelComplete();
    }
  }

  private resetLevel(): void {
    this.resetRotation += Math.PI * 2;
    this.setupLevel(this.currentLevel);
  }

  private nextLevel(): void {
    if (this.currentLevel < this.totalLevels) {
      this.currentLevel++;
      this.setupLevel(this.currentLevel);
    } else {
      this.isVictory = true;
      this.victoryTime = this.gameTime;
      this.audioManager.playVictoryMelody();
    }
  }

  private update(deltaTime: number): void {
    this.gameTime += deltaTime;

    if (this.hoverReset) {
      this.resetRotation += deltaTime * 0.5;
    }

    this.maze.updateEdges(deltaTime);

    this.particles.forEach((p) => p.update(deltaTime));

    this.ripples = this.ripples.filter(
      (r) => this.gameTime - r.startTime < r.duration
    );

    this.energyWaves = this.energyWaves.filter(
      (w) => this.gameTime - w.startTime < w.duration
    );

    if (this.isLevelComplete && !this.isVictory) {
      const elapsed = this.gameTime - this.levelCompleteTime;
      if (elapsed > this.levelTransitionDelay) {
        this.nextLevel();
      }
    }
  }

  private render(): void {
    const state: RenderState = {
      maze: this.maze,
      particles: this.particles,
      ripples: this.ripples,
      energyWaves: this.energyWaves,
      currentLevel: this.currentLevel,
      totalLevels: this.totalLevels,
      steps: this.steps,
      isVictory: this.isVictory,
      victoryTime: this.victoryTime,
      isLevelComplete: this.isLevelComplete,
      levelCompleteTime: this.levelCompleteTime,
      hoverReset: this.hoverReset,
      resetRotation: this.resetRotation,
    };

    const deltaTime = this.lastTime ? (performance.now() - this.lastTime) / 1000 : 0;
    this.renderer.render(state, deltaTime);
  }

  private startGameLoop(): void {
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      this.update(deltaTime);
      this.render();

      this._animationId = requestAnimationFrame(loop);
    };

    this._animationId = requestAnimationFrame(loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
