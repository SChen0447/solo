import { QuantumParticle, SparkParticle, renderEntanglementLine } from './particles.js';
import { PuzzleController } from './puzzle.js';
import { UIRenderer, GameStats } from './ui.js';

const STATUS_BAR_HEIGHT = 40;
const ORBIT_PERIOD = 4000;
const SPRING = 0.02;
const DAMPING = 0.95;

interface GameState {
  mode: 'idle' | 'puzzle' | 'puzzleComplete' | 'victory';
  operations: number;
  puzzleStartTime: number;
  totalStartTime: number;
  elapsedPausedUntil: number;
  showCompleteUntil: number;
}

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number = 0;
  height: number = 0;
  dpr: number;

  blueParticle!: QuantumParticle;
  redParticle!: QuantumParticle;
  puzzleController: PuzzleController;
  uiRenderer: UIRenderer;
  sparks: SparkParticle[] = [];

  state: GameState;
  settings: {
    sensitivity: number;
    soundEnabled: boolean;
  };

  draggingParticle: QuantumParticle | null = null;
  mouseX: number = 0;
  mouseY: number = 0;

  orbitAngle: number = 0;
  lastTime: number = 0;
  animationId: number = 0;

  audioContext: AudioContext | null = null;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取 Canvas 2D 上下文');
    }
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;

    this.state = {
      mode: 'idle',
      operations: 0,
      puzzleStartTime: 0,
      totalStartTime: 0,
      elapsedPausedUntil: 0,
      showCompleteUntil: 0
    };

    this.settings = {
      sensitivity: 1.0,
      soundEnabled: true
    };

    this.resize();

    this.puzzleController = new PuzzleController(this.width, this.height, STATUS_BAR_HEIGHT);
    this.uiRenderer = new UIRenderer(this.width, this.height, STATUS_BAR_HEIGHT);

    this.initParticles();
    this.bindEvents();

    this.state.totalStartTime = performance.now();
    this.state.puzzleStartTime = performance.now();
    this.startPuzzle(1);

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.blueParticle && this.redParticle) {
      const centerX = this.width / 2;
      const centerY = (this.height - STATUS_BAR_HEIGHT) / 2;
      this.blueParticle.updateCenter(centerX, centerY);
      this.redParticle.updateCenter(centerX, centerY);
    }

    if (this.puzzleController) {
      this.puzzleController.updateCanvasSize(this.width, this.height);
    }
    if (this.uiRenderer) {
      this.uiRenderer.updateSize(this.width, this.height);
    }
  }

  initParticles(): void {
    const scale = Math.min(this.width / 1200, 1.5);
    const radius = 12 * scale;
    const centerX = this.width / 2;
    const centerY = (this.height - STATUS_BAR_HEIGHT) / 2;

    this.blueParticle = new QuantumParticle({
      baseColor: '#4A90D9',
      entangledColor: '#FFAA00',
      radius: radius,
      centerX: centerX,
      centerY: centerY
    });

    this.redParticle = new QuantumParticle({
      baseColor: '#FF6B6B',
      entangledColor: '#00D4FF',
      radius: radius,
      centerX: centerX,
      centerY: centerY
    });
  }

  bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));

    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    window.addEventListener('touchend', (e) => this.onTouchEnd(e));

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetPuzzle());
    }

    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    if (settingsBtn && settingsPanel) {
      settingsBtn.addEventListener('click', () => {
        settingsPanel.classList.toggle('open');
      });
    }

    const sensitivitySlider = document.getElementById('sensitivity-slider') as HTMLInputElement;
    if (sensitivitySlider) {
      sensitivitySlider.addEventListener('input', (e) => {
        this.settings.sensitivity = parseFloat((e.target as HTMLInputElement).value);
      });
    }

    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        this.settings.soundEnabled = !this.settings.soundEnabled;
        soundToggle.classList.toggle('off', !this.settings.soundEnabled);
      });
    }

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.restartGame());
    }
  }

  getMousePos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  onMouseDown(e: MouseEvent): void {
    const pos = this.getMousePos(e);
    this.mouseX = pos.x;
    this.mouseY = pos.y;

    if (this.blueParticle.containsPoint(pos.x, pos.y)) {
      this.draggingParticle = this.blueParticle;
    } else if (this.redParticle.containsPoint(pos.x, pos.y)) {
      this.draggingParticle = this.redParticle;
    }

    if (this.draggingParticle) {
      this.draggingParticle.startDrag(pos.x, pos.y, this.settings.sensitivity);
      this.state.operations++;
    }
  }

  onMouseMove(e: MouseEvent): void {
    const pos = this.getMousePos(e);
    this.mouseX = pos.x;
    this.mouseY = pos.y;

    if (this.draggingParticle) {
      this.draggingParticle.updateDrag(pos.x, pos.y, this.settings.sensitivity);
    }
  }

  onMouseUp(_e: MouseEvent): void {
    if (this.draggingParticle) {
      this.draggingParticle.endDrag();
      this.draggingParticle = null;
      this.checkPuzzleSolution();
    }
  }

  onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const pos = this.getMousePos(e.touches[0]);
    this.mouseX = pos.x;
    this.mouseY = pos.y;

    if (this.blueParticle.containsPoint(pos.x, pos.y)) {
      this.draggingParticle = this.blueParticle;
    } else if (this.redParticle.containsPoint(pos.x, pos.y)) {
      this.draggingParticle = this.redParticle;
    }

    if (this.draggingParticle) {
      this.draggingParticle.startDrag(pos.x, pos.y, this.settings.sensitivity);
      this.state.operations++;
    }
  }

  onTouchMove(e: TouchEvent): void {
    if (e.touches.length === 0) return;
    e.preventDefault();
    const pos = this.getMousePos(e.touches[0]);
    this.mouseX = pos.x;
    this.mouseY = pos.y;

    if (this.draggingParticle) {
      this.draggingParticle.updateDrag(pos.x, pos.y, this.settings.sensitivity);
    }
  }

  onTouchEnd(_e: TouchEvent): void {
    if (this.draggingParticle) {
      this.draggingParticle.endDrag();
      this.draggingParticle = null;
      this.checkPuzzleSolution();
    }
  }

  startPuzzle(index: number): void {
    this.puzzleController.generatePuzzle(index);
    this.blueParticle.setPuzzlePosition(
      this.puzzleController.state.blueStartX,
      this.puzzleController.state.blueStartY
    );
    this.redParticle.setPuzzlePosition(
      this.puzzleController.state.redStartX,
      this.puzzleController.state.redStartY
    );
    this.state.mode = 'puzzle';
    this.state.puzzleStartTime = performance.now();
  }

  checkPuzzleSolution(): void {
    if (this.state.mode !== 'puzzle') return;

    const result = this.puzzleController.checkSolution(this.blueParticle, this.redParticle);

    if (result.success) {
      this.playSuccessSound();
      this.spawnSparks(this.width / 2, (this.height - STATUS_BAR_HEIGHT) / 2);
      this.state.showCompleteUntil = performance.now() + 1500;
      this.state.mode = 'puzzleComplete';

      const currentPuzzle = this.puzzleController.state.currentPuzzle;
      if (currentPuzzle >= this.puzzleController.state.totalPuzzles) {
        setTimeout(() => {
          this.state.mode = 'victory';
        }, 1500);
      } else {
        setTimeout(() => {
          this.startPuzzle(currentPuzzle + 1);
        }, 1500);
      }
    } else if (!result.blueCorrect || !result.redCorrect) {
      const atLeastOneClose = this.isAnyParticleNearTarget();
      if (atLeastOneClose) {
        this.playErrorSound();
        this.blueParticle.startBounce();
        this.redParticle.startBounce();
      }
    }
  }

  isAnyParticleNearTarget(): boolean {
    const scale = Math.min(this.width / 1200, 1.5);
    const tolerance = 40 * scale;

    for (const target of this.puzzleController.state.targets) {
      if (this.blueParticle.distanceTo(target.x, target.y) < tolerance) return true;
      if (this.redParticle.distanceTo(target.x, target.y) < tolerance) return true;
    }
    return false;
  }

  resetPuzzle(): void {
    this.playErrorSound();
    this.puzzleController.resetCurrentPuzzle();
    this.blueParticle.setPuzzlePosition(
      this.puzzleController.state.blueStartX,
      this.puzzleController.state.blueStartY
    );
    this.redParticle.setPuzzlePosition(
      this.puzzleController.state.redStartX,
      this.puzzleController.state.redStartY
    );
    this.state.mode = 'puzzle';
    this.state.elapsedPausedUntil = performance.now() + 3000;
  }

  restartGame(): void {
    this.state.operations = 0;
    this.state.totalStartTime = performance.now();
    this.state.mode = 'puzzle';
    this.puzzleController.restartGame();
    this.blueParticle.setPuzzlePosition(
      this.puzzleController.state.blueStartX,
      this.puzzleController.state.blueStartY
    );
    this.redParticle.setPuzzlePosition(
      this.puzzleController.state.redStartX,
      this.puzzleController.state.redStartY
    );
    this.sparks = [];

    const settingsPanel = document.getElementById('settings-panel');
    if (settingsPanel) {
      settingsPanel.classList.remove('open');
    }
  }

  spawnSparks(x: number, y: number): void {
    for (let i = 0; i < 200; i++) {
      this.sparks.push(new SparkParticle(x, y));
    }
  }

  getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  playSuccessSound(): void {
    if (!this.settings.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // 忽略音频错误
    }
  }

  playErrorSound(): void {
    if (!this.settings.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.setValueAtTime(150, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // 忽略音频错误
    }
  }

  getElapsedMs(): number {
    const now = performance.now();
    const paused = Math.max(0, Math.min(3000, this.state.elapsedPausedUntil - now));
    return now - this.state.totalStartTime - paused;
  }

  getPuzzleElapsedMs(): number {
    const now = performance.now();
    const paused = Math.max(0, Math.min(3000, this.state.elapsedPausedUntil - now));
    return now - this.state.puzzleStartTime - paused;
  }

  update(dt: number, _time: number): void {
    if (this.state.mode === 'puzzle') {
      this.orbitAngle += (dt / ORBIT_PERIOD) * Math.PI * 2;
    }

    if (this.state.mode !== 'puzzle' || this.draggingParticle) {
      if (!this.draggingParticle) {
        this.blueParticle.update(SPRING, DAMPING);
        this.redParticle.update(SPRING, DAMPING);
      }
    } else {
      this.blueParticle.update(SPRING, DAMPING);
      this.redParticle.update(SPRING, DAMPING);
    }

    if (this.blueParticle.isDragging) {
      this.redParticle.updateEntangledPosition(this.blueParticle);
    } else if (this.redParticle.isDragging) {
      this.blueParticle.updateEntangledPosition(this.redParticle);
    } else {
      this.blueParticle.resetEntangledColor();
      this.redParticle.resetEntangledColor();
    }

    this.sparks = this.sparks.filter(s => s.update());
  }

  render(time: number): void {
    const ctx = this.ctx;

    const bgGradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    bgGradient.addColorStop(0, '#0A0A2E');
    bgGradient.addColorStop(1, '#1A1A3E');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.state.mode === 'victory') {
      this.uiRenderer.renderVictory(ctx, this.getElapsedMs(), this.state.operations, time);
    }

    if (this.state.mode === 'puzzle' || this.state.mode === 'puzzleComplete') {
      this.puzzleController.renderTargets(ctx);
    }

    if (this.state.mode !== 'victory') {
      renderEntanglementLine(ctx, this.blueParticle, this.redParticle, time);
    }

    this.blueParticle.render(ctx);
    this.redParticle.render(ctx);

    for (const spark of this.sparks) {
      spark.render(ctx);
    }

    if (this.state.mode === 'puzzle') {
      const hint = '拖拽粒子到对应颜色的目标点上';
      this.uiRenderer.renderHint(ctx, hint, time);
      this.uiRenderer.renderColorLegend(ctx);
    }

    if (this.state.mode === 'puzzleComplete' && time < this.state.showCompleteUntil) {
      this.uiRenderer.renderPuzzleComplete(
        ctx,
        this.puzzleController.state.currentPuzzle,
        this.puzzleController.state.totalPuzzles,
        time
      );
    }

    const stats: GameStats = {
      puzzleIndex: this.puzzleController.state.currentPuzzle,
      totalPuzzles: this.puzzleController.state.totalPuzzles,
      operations: this.state.operations,
      elapsedMs: this.getElapsedMs()
    };
    this.uiRenderer.updateStatusDOM(stats);
  }

  loop = (time: number): void => {
    const dt = time - this.lastTime;
    this.lastTime = time;

    this.update(dt, time);
    this.render(time);

    this.animationId = requestAnimationFrame(this.loop);
  };

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
