import { Terrain } from './terrain';
import { Bird } from './bird';
import { AudioManager } from './audio';
import { UIManager } from './ui';

const SKY_TOP_START = '#87CEEB';
const SKY_BOTTOM_START = '#f0e68c';
const SKY_NIGHT = '#0a0a2e';
const TOTAL_JUMPS_FOR_NIGHT = 120;
const HUE_ROTATE_PER_JUMP = 4;
const BG_TRANSITION_MS = 2000;
const BPM = 120;
const BEAT_INTERVAL = 60000 / BPM;

interface RGB {
  r: number;
  g: number;
  b: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private terrain: Terrain;
  private bird: Bird;
  private audio: AudioManager;
  private ui: UIManager;

  private lastTime: number = 0;
  private animationId: number = 0;
  private lastBeat: number = 0;

  private targetHueShift: number = 0;
  private currentHueShift: number = 0;
  private hueShiftStartTime: number = 0;
  private prevHueShift: number = 0;

  private targetNightBlend: number = 0;
  private currentNightBlend: number = 0;
  private nightBlendStartTime: number = 0;
  private prevNightBlend: number = 0;

  constructor() {
    this.canvas = document.getElementById('game') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    this.resize();

    this.terrain = new Terrain(this.canvas.width, this.canvas.height);

    const startX = this.canvas.width * 0.15;
    const startY = this.terrain.getHeightAt(startX) - 24 - 20;
    this.bird = new Bird(startX, startY);

    this.audio = new AudioManager();
    this.ui = new UIManager();
    this.ui.bindCanvas(this.canvas);

    this.bird.onValidJump = () => {
      this.audio.playJumpSound();
      this.startHueTransition();
      this.startNightTransition();
    };

    this.bird.onComboBonus = () => {
      this.ui.triggerFlash();
    };

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('click', () => this.audio.init(), { once: true });
    window.addEventListener('keydown', () => this.audio.init(), { once: true });

    this.lastTime = performance.now();
    this.lastBeat = this.lastTime;
  }

  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.ctx.imageSmoothingEnabled = false;

    if (this.terrain) {
      this.terrain.resize(this.canvas.width, this.canvas.height);
    }
    if (this.bird) {
      const startX = this.canvas.width * 0.15;
      const startY = this.terrain.getHeightAt(startX) - 24 - 20;
      if (!this.bird.isGameOver()) {
        this.bird.reset(startY);
      }
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!this.bird.isGameOver()) {
        this.bird.jump();
      }
    } else if (e.code === 'KeyR') {
      e.preventDefault();
      this.restart();
    }
  }

  private startHueTransition(): void {
    this.prevHueShift = this.currentHueShift;
    this.targetHueShift += HUE_ROTATE_PER_JUMP;
    this.hueShiftStartTime = performance.now();
  }

  private startNightTransition(): void {
    this.prevNightBlend = this.currentNightBlend;
    const jumps = Math.min(this.bird.getJumpCount(), TOTAL_JUMPS_FOR_NIGHT);
    this.targetNightBlend = jumps / TOTAL_JUMPS_FOR_NIGHT;
    this.nightBlendStartTime = performance.now();
  }

  private updateTransitions(now: number): void {
    const hueElapsed = now - this.hueShiftStartTime;
    const hueT = Math.min(hueElapsed / BG_TRANSITION_MS, 1);
    const hueEased = this.easeInOutCubic(hueT);
    this.currentHueShift = this.prevHueShift + (this.targetHueShift - this.prevHueShift) * hueEased;

    const nightElapsed = now - this.nightBlendStartTime;
    const nightT = Math.min(nightElapsed / BG_TRANSITION_MS, 1);
    const nightEased = this.easeInOutCubic(nightT);
    this.currentNightBlend = this.prevNightBlend + (this.targetNightBlend - this.prevNightBlend) * nightEased;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private parseHex(hex: string): RGB {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  }

  private rgbToString(c: RGB): string {
    return `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;
  }

  private applyHueShift(color: RGB, degrees: number): RGB {
    const rad = (degrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const matrix = [
      0.213 + cos * 0.787 - sin * 0.213,
      0.715 - cos * 0.715 - sin * 0.715,
      0.072 - cos * 0.072 + sin * 0.928,
      0.213 - cos * 0.213 + sin * 0.143,
      0.715 + cos * 0.285 + sin * 0.140,
      0.072 - cos * 0.072 - sin * 0.283,
      0.213 - cos * 0.213 - sin * 0.787,
      0.715 - cos * 0.715 + sin * 0.715,
      0.072 + cos * 0.928 + sin * 0.072
    ];

    return {
      r: Math.max(0, Math.min(255, color.r * matrix[0] + color.g * matrix[1] + color.b * matrix[2])),
      g: Math.max(0, Math.min(255, color.r * matrix[3] + color.g * matrix[4] + color.b * matrix[5])),
      b: Math.max(0, Math.min(255, color.r * matrix[6] + color.g * matrix[7] + color.b * matrix[8]))
    };
  }

  private lerpColor(a: RGB, b: RGB, t: number): RGB {
    return {
      r: a.r + (b.r - a.r) * t,
      g: a.g + (b.g - a.g) * t,
      b: a.b + (b.b - a.b) * t
    };
  }

  private drawBackground(): void {
    const topColor = this.parseHex(SKY_TOP_START);
    const bottomColor = this.parseHex(SKY_BOTTOM_START);
    const nightColor = this.parseHex(SKY_NIGHT);

    const shiftedTop = this.applyHueShift(topColor, this.currentHueShift);
    const shiftedBottom = this.applyHueShift(bottomColor, this.currentHueShift);

    const finalTop = this.lerpColor(shiftedTop, nightColor, this.currentNightBlend);
    const finalBottom = this.lerpColor(shiftedBottom, nightColor, this.currentNightBlend * 0.8);

    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, this.rgbToString(finalTop));
    gradient.addColorStop(1, this.rgbToString(finalBottom));

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.currentNightBlend > 0.5) {
      this.drawStars((this.currentNightBlend - 0.5) * 2);
    }
  }

  private drawStars(alpha: number): void {
    this.ctx.save();
    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    const starCount = Math.floor(80 * alpha);
    for (let i = 0; i < starCount; i++) {
      const x = (i * 7919) % this.canvas.width;
      const y = (i * 104729) % (this.canvas.height * 0.6);
      const size = (i % 3) + 1;
      this.ctx.fillRect(x, y, size, size);
    }
    this.ctx.restore();
  }

  private restart = (): void => {
    this.targetHueShift = 0;
    this.currentHueShift = 0;
    this.prevHueShift = 0;
    this.targetNightBlend = 0;
    this.currentNightBlend = 0;
    this.prevNightBlend = 0;

    const startX = this.canvas.width * 0.15;
    const startY = this.terrain.getHeightAt(startX) - 24 - 20;
    this.bird.reset(startY);
    this.ui.reset();
    this.ui.hideGameOver();
  };

  private loop = (now: number): void => {
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    this.updateTransitions(now);
    this.terrain.update(now);
    this.ui.update(deltaTime);

    if (now - this.lastBeat >= BEAT_INTERVAL) {
      this.lastBeat = now;
      this.audio.playBeatSound();
    }

    if (!this.bird.isGameOver()) {
      const terrainHeight = this.terrain.getHeightAt(this.bird.getX());
      this.bird.update(terrainHeight);
    }

    this.ctx.imageSmoothingEnabled = false;
    this.drawBackground();
    this.terrain.draw(this.ctx);
    this.bird.draw(this.ctx);
    this.ui.drawScore(this.ctx, this.bird.getScore());
    this.ui.drawFlash(this.ctx, this.canvas.width, this.canvas.height);

    if (this.bird.isGameOver()) {
      this.ui.drawGameOver(
        this.ctx,
        this.canvas.width,
        this.canvas.height,
        this.bird.getScore(),
        this.bird.getMaxCombo(),
        this.restart
      );
    }

    this.animationId = requestAnimationFrame(this.loop);
  };

  start(): void {
    this.animationId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.ui.unbindCanvas();
  }
}

const game = new Game();
game.start();
