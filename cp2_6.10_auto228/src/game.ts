import { Player, HistoryFrame } from './player';
import { Platform, Spike, GoldBall, generateLevel } from './obstacle';
import { UIManager } from './ui';

enum GameState {
  PLAYING = 'playing',
  REWINDING = 'rewinding',
  GAME_OVER = 'game_over'
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 600;
const REWIND_COOLDOWN_MS = 8000;
const REWIND_DURATION_MS = 3000;
const INITIAL_REWIND_COUNT = 3;
const INITIAL_LIVES = 3;
const STORAGE_KEY_BEST_SCORE = 'timeRewind_bestScore';
const STORAGE_KEY_BEST_TIME = 'timeRewind_bestTime';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private platforms: Platform[] = [];
  private spikes: Spike[] = [];
  private goldBalls: GoldBall[] = [];
  private ui: UIManager;
  private state: GameState = GameState.PLAYING;
  private score: number = 0;
  private lives: number = INITIAL_LIVES;
  private goldBallsCollected: number = 0;
  private rewindCount: number = INITIAL_REWIND_COUNT;
  private rewindCooldown: number = 0;
  private rewindElapsed: number = 0;
  private rewindFrameIndex: number = 0;
  private bestScore: number = 0;
  private bestTime: number | null = null;
  private levelStartTime: number = 0;
  private lastFrameTime: number = 0;
  private animationId: number | null = null;
  private audioContext: AudioContext | null = null;
  private bgmOscillator: OscillatorNode | null = null;
  private bgmGain: GainNode | null = null;
  private isMobile: boolean = false;
  private joystickActive: { x: number; y: number } | null = null;
  private jumpPressed: boolean = false;
  private rewindPressed: boolean = false;
  private joystickTouchId: number | null = null;
  private jumpTouchId: number | null = null;
  private rewindTouchId: number | null = null;

  constructor() {
    const canvasEl = document.getElementById('game-canvas');
    if (!canvasEl) throw new Error('Canvas not found');
    this.canvas = canvasEl as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D context not available');
    this.ctx = ctx;

    this.player = new Player(50, 500);
    this.ui = new UIManager(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.isMobile = this.ui.getIsMobile();

    this.loadBestRecords();
    this.setupResponsiveCanvas();
    this.setupInput();
    this.generateNewLevel();
    this.initAudio();
  }

  private loadBestRecords(): void {
    try {
      const savedScore = localStorage.getItem(STORAGE_KEY_BEST_SCORE);
      if (savedScore) this.bestScore = parseInt(savedScore, 10) || 0;
      const savedTime = localStorage.getItem(STORAGE_KEY_BEST_TIME);
      if (savedTime) this.bestTime = parseInt(savedTime, 10) || null;
    } catch (_) {
      this.bestScore = 0;
      this.bestTime = null;
    }
  }

  private saveBestScore(): void {
    try {
      localStorage.setItem(STORAGE_KEY_BEST_SCORE, String(this.bestScore));
    } catch (_) {}
  }

  private saveBestTime(time: number): void {
    try {
      localStorage.setItem(STORAGE_KEY_BEST_TIME, String(time));
    } catch (_) {}
  }

  private setupResponsiveCanvas(): void {
    const handleResize = () => {
      const container = document.getElementById('game-container');
      if (!container) return;
      const containerW = container.clientWidth;
      const containerH = container.clientHeight;
      const scale = Math.min(containerW / CANVAS_WIDTH, containerH / CANVAS_HEIGHT, 1);
      this.canvas.style.width = `${CANVAS_WIDTH * scale}px`;
      this.canvas.style.height = `${CANVAS_HEIGHT * scale}px`;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
  }

  private setupInput(): void {
    const keyMap: Record<string, 'left' | 'right' | 'jump'> = {
      ArrowLeft: 'left',
      a: 'left',
      A: 'left',
      ArrowRight: 'right',
      d: 'right',
      D: 'right',
      ArrowUp: 'jump',
      w: 'jump',
      W: 'jump',
      ' ': 'jump'
    };

    window.addEventListener('keydown', (e) => {
      if (keyMap[e.key]) {
        this.player.setKey(keyMap[e.key], true);
        if (keyMap[e.key] === 'jump') {
          if (this.player.tryJump()) {
            this.ui.spawnJumpParticles(
              this.player.x + this.player.width / 2,
              this.player.y + this.player.height
            );
          }
        }
        e.preventDefault();
      }
      if (e.key === 't' || e.key === 'T') {
        this.tryStartRewind();
      }
      if (e.key === 'r' || e.key === 'R') {
        this.resetGame();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (keyMap[e.key]) {
        this.player.setKey(keyMap[e.key], false);
        e.preventDefault();
      }
    });

    if (this.isMobile) {
      this.setupTouchInput();
    }
  }

  private setupTouchInput(): void {
    const getCanvasCoords = (touch: Touch) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    };

    const isInJoystick = (x: number, y: number) => {
      const scale = CANVAS_WIDTH / 1200;
      const jx = 80 * scale;
      const jy = CANVAS_HEIGHT - 100 * scale;
      const jr = 40 * scale;
      const dx = x - jx;
      const dy = y - jy;
      return dx * dx + dy * dy <= jr * jr * 4;
    };

    const isInJumpBtn = (x: number, y: number) => {
      const scale = CANVAS_WIDTH / 1200;
      const bx = CANVAS_WIDTH - 80 * scale;
      const by = CANVAS_HEIGHT - 90 * scale;
      const bs = 40 * scale;
      return x >= bx - bs / 2 && x <= bx + bs / 2 && y >= by - bs / 2 && y <= by + bs / 2;
    };

    const isInRewindBtn = (x: number, y: number) => {
      const scale = CANVAS_WIDTH / 1200;
      const bx = CANVAS_WIDTH - 150 * scale;
      const by = CANVAS_HEIGHT - 100 * scale;
      const bs = 50 * scale;
      const dx = x - bx;
      const dy = y - by;
      return dx * dx + dy * dy <= (bs / 2) * (bs / 2);
    };

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const pos = getCanvasCoords(touch);

        if (this.joystickTouchId === null && isInJoystick(pos.x, pos.y)) {
          this.joystickTouchId = touch.identifier;
          this.updateJoystick(pos);
        } else if (this.jumpTouchId === null && isInJumpBtn(pos.x, pos.y)) {
          this.jumpTouchId = touch.identifier;
          this.jumpPressed = true;
          if (this.player.tryJump()) {
            this.ui.spawnJumpParticles(
              this.player.x + this.player.width / 2,
              this.player.y + this.player.height
            );
          }
        } else if (this.rewindTouchId === null && isInRewindBtn(pos.x, pos.y)) {
          this.rewindTouchId = touch.identifier;
          this.rewindPressed = true;
          this.tryStartRewind();
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        if (touch.identifier === this.joystickTouchId) {
          const pos = getCanvasCoords(touch);
          this.updateJoystick(pos);
        }
      }
    }, { passive: false });

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.joystickTouchId) {
          this.joystickTouchId = null;
          this.joystickActive = null;
          this.player.setKey('left', false);
          this.player.setKey('right', false);
        } else if (touch.identifier === this.jumpTouchId) {
          this.jumpTouchId = null;
          this.jumpPressed = false;
        } else if (touch.identifier === this.rewindTouchId) {
          this.rewindTouchId = null;
          this.rewindPressed = false;
        }
      }
    };
    this.canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
  }

  private updateJoystick(pos: { x: number; y: number }): void {
    const scale = CANVAS_WIDTH / 1200;
    const jx = 80 * scale;
    const jy = CANVAS_HEIGHT - 100 * scale;
    const jr = 40 * scale;
    const dx = pos.x - jx;
    const dy = pos.y - jy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      const normalized = Math.min(dist / jr, 1);
      const nx = (dx / dist) * normalized;
      const ny = (dy / dist) * normalized;
      this.joystickActive = { x: nx, y: ny };

      this.player.setKey('left', nx < -0.3);
      this.player.setKey('right', nx > 0.3);
    }
  }

  private generateNewLevel(): void {
    const level = generateLevel();
    this.platforms = level.platforms;
    this.spikes = level.spikes;
    this.goldBalls = level.goldBalls;
    this.goldBallsCollected = 0;
    this.player.x = 50;
    this.player.y = 500;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.clearHistory();
    this.levelStartTime = performance.now();
    this.ui.triggerLevelTransition();
  }

  private resetGame(): void {
    this.state = GameState.PLAYING;
    this.lives = INITIAL_LIVES;
    this.rewindCount = INITIAL_REWIND_COUNT;
    this.rewindCooldown = 0;
    this.rewindElapsed = 0;
    this.generateNewLevel();
  }

  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch (_) {
      this.audioContext = null;
    }

    const startAudio = () => {
      if (!this.audioContext) return;
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      if (!this.bgmOscillator) {
        this.startBGM();
      }
      window.removeEventListener('pointerdown', startAudio);
      window.removeEventListener('keydown', startAudio);
    };
    window.addEventListener('pointerdown', startAudio);
    window.addEventListener('keydown', startAudio);
  }

  private startBGM(): void {
    if (!this.audioContext) return;
    try {
      this.bgmGain = this.audioContext.createGain();
      this.bgmGain.gain.value = 0.05;
      this.bgmGain.connect(this.audioContext.destination);

      this.bgmOscillator = this.audioContext.createOscillator();
      this.bgmOscillator.type = 'sine';
      this.bgmOscillator.frequency.value = 60;
      this.bgmOscillator.connect(this.bgmGain);
      this.bgmOscillator.start();

      const lfo = this.audioContext.createOscillator();
      const lfoGain = this.audioContext.createGain();
      lfo.frequency.value = 0.5;
      lfoGain.gain.value = 20;
      lfo.connect(lfoGain);
      lfoGain.connect(this.bgmOscillator.frequency);
      lfo.start();
    } catch (_) {}
  }

  private pauseBGM(): void {
    if (this.bgmGain && this.audioContext) {
      this.bgmGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.1);
    }
  }

  private resumeBGM(): void {
    if (this.bgmGain && this.audioContext) {
      this.bgmGain.gain.setTargetAtTime(0.05, this.audioContext.currentTime, 0.1);
    }
  }

  private tryStartRewind(): void {
    if (this.state !== GameState.PLAYING) return;
    if (this.rewindCount <= 0 || this.rewindCooldown > 0) return;
    if (this.player.recordHistory.length < 10) return;

    this.state = GameState.REWINDING;
    this.rewindCount--;
    this.rewindCooldown = REWIND_COOLDOWN_MS;
    this.rewindElapsed = 0;
    this.rewindFrameIndex = this.player.recordHistory.length - 1;
    this.ui.triggerRewindEffects();
    this.pauseBGM();
  }

  private updateRewind(deltaMs: number): void {
    this.rewindElapsed += deltaMs;
    const totalFrames = this.player.recordHistory.length;
    const targetFrames = Math.min(totalFrames, Math.floor((REWIND_DURATION_MS / 1000) * 60));
    const progress = Math.min(this.rewindElapsed / REWIND_DURATION_MS, 1);
    this.rewindFrameIndex = Math.max(0, totalFrames - 1 - Math.floor(progress * targetFrames));

    const frame = this.player.recordHistory[this.rewindFrameIndex];
    if (frame) {
      this.applyRewindFrame(frame);
    }

    if (this.rewindElapsed >= REWIND_DURATION_MS || this.rewindFrameIndex <= 0) {
      this.finishRewind();
    }
  }

  private applyRewindFrame(frame: HistoryFrame): void {
    this.player.restoreFrame(frame);

    for (const spikeState of frame.spikeStates) {
      const spike = this.spikes.find((s) => s.id === spikeState.id);
      if (spike) spike.restoreState(spikeState);
    }

    for (const ballState of frame.ballStates) {
      const ball = this.goldBalls.find((b) => b.id === ballState.id);
      if (ball) ball.restoreState(ballState);
    }

    this.goldBallsCollected = this.goldBalls.filter((b) => b.collected).length;
  }

  private finishRewind(): void {
    this.state = GameState.PLAYING;
    this.player.clearHistory();
    this.ui.triggerRewindEndAura();
    this.resumeBGM();
  }

  private checkCollisions(): void {
    if (this.state !== GameState.PLAYING) return;

    for (const spike of this.spikes) {
      if (this.player.checkSpikeCollision(spike)) {
        this.onPlayerHit();
        return;
      }
    }

    for (const ball of this.goldBalls) {
      if (!ball.collected && this.player.checkGoldBallCollision(ball)) {
        ball.collected = true;
        this.goldBallsCollected++;
        this.score += 10;
        if (this.score > this.bestScore) {
          this.bestScore = this.score;
          this.saveBestScore();
        }
        this.checkLevelComplete();
      }
    }

    if (this.player.x + this.player.width >= CANVAS_WIDTH - 10) {
      this.onLevelComplete();
    }
  }

  private onPlayerHit(): void {
    this.lives--;
    if (this.lives <= 0) {
      this.state = GameState.GAME_OVER;
      this.pauseBGM();
    } else {
      this.player.x = 50;
      this.player.y = 500;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.clearHistory();
    }
  }

  private checkLevelComplete(): void {
    const totalBalls = this.goldBalls.length;
    if (this.goldBallsCollected >= totalBalls) {
      this.onLevelComplete();
    }
  }

  private onLevelComplete(): void {
    const levelTime = performance.now() - this.levelStartTime;
    if (this.bestTime === null || levelTime < this.bestTime) {
      this.bestTime = levelTime;
      this.saveBestTime(levelTime);
    }
    this.generateNewLevel();
  }

  private update(deltaMs: number): void {
    const deltaTime = deltaMs / 1000;

    this.ui.update(deltaTime);

    if (this.state === GameState.REWINDING) {
      this.updateRewind(deltaMs);
      return;
    }

    if (this.state !== GameState.PLAYING) return;

    if (this.rewindCooldown > 0) {
      this.rewindCooldown = Math.max(0, this.rewindCooldown - deltaMs);
    }

    this.player.update(this.platforms);

    for (const spike of this.spikes) {
      spike.update();
    }

    for (const ball of this.goldBalls) {
      ball.update(deltaTime);
    }

    const spikeStates = this.spikes.map((s) => s.getState());
    const ballStates = this.goldBalls.map((b) => b.getState());
    this.player.recordFrame(spikeStates, ballStates);

    this.checkCollisions();
  }

  private render(): void {
    this.ui.renderBackground(this.ctx);

    for (const platform of this.platforms) {
      platform.render(this.ctx);
    }

    for (const ball of this.goldBalls) {
      ball.render(this.ctx);
    }

    for (const spike of this.spikes) {
      spike.render(this.ctx);
    }

    this.player.render(this.ctx);

    this.ui.renderParticles(this.ctx);

    this.ui.renderRewindStatus(
      this.ctx,
      this.rewindCount,
      this.rewindCooldown,
      REWIND_COOLDOWN_MS
    );

    this.ui.renderStatusPanel(this.ctx, {
      goldBallsCollected: this.goldBallsCollected,
      totalGoldBalls: this.goldBalls.length,
      lives: this.lives,
      rewindCount: this.rewindCount,
      rewindCooldown: this.rewindCooldown,
      rewindCooldownMax: REWIND_COOLDOWN_MS,
      score: this.score
    });

    this.ui.renderRewindEffects(
      this.ctx,
      this.state === GameState.REWINDING,
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height
    );

    if (this.isMobile) {
      this.ui.renderMobileControls(
        this.ctx,
        this.joystickActive,
        this.jumpPressed,
        this.rewindPressed
      );
    }

    this.ui.renderLevelTransition(this.ctx);

    if (this.state === GameState.GAME_OVER) {
      this.ui.renderGameOver(this.ctx, this.score, this.bestScore, this.bestTime);
    }
  }

  private loop = (timestamp: number): void => {
    if (this.lastFrameTime === 0) this.lastFrameTime = timestamp;
    const deltaMs = Math.min(timestamp - this.lastFrameTime, 50);
    this.lastFrameTime = timestamp;

    this.update(deltaMs);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  start(): void {
    this.lastFrameTime = 0;
    this.animationId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

const game = new Game();
game.start();
