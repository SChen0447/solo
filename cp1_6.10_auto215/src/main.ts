import { MirrorManager } from './mirror';
import { BeamManager } from './beam';
import { UIController } from './ui';

const EMITTER_X = 30;
const EMITTER_Y = 30;
const RECEIVER_RADIUS = 25;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  private mirrorManager: MirrorManager;
  private beamManager: BeamManager;
  private ui: UIController;

  private receiverX: number;
  private receiverY: number;
  private receiverPulse: number;
  private fadeAlpha: number;
  private fadeDirection: number;
  private pendingReset: boolean;

  private lastTime: number;
  private rafId: number;
  private running: boolean;

  private beamSpeed = 120;
  private rotationSensitivity = 3;
  private maxSplits = 2;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) throw new Error(`Canvas with id "${canvasId}" not found`);
    this.canvas = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context not available');
    this.ctx = ctx;

    this.width = 0;
    this.height = 0;
    this.receiverX = 0;
    this.receiverY = 0;
    this.receiverPulse = 0;
    this.fadeAlpha = 0;
    this.fadeDirection = 0;
    this.pendingReset = false;
    this.lastTime = 0;
    this.rafId = 0;
    this.running = false;

    this.resize();

    this.mirrorManager = new MirrorManager(this.width, this.height, this.rotationSensitivity);
    this.beamManager = new BeamManager(
      EMITTER_X,
      EMITTER_Y,
      this.beamSpeed,
      this.maxSplits,
      this.mirrorManager.mirrors,
      this.width,
      this.height
    );

    this.ui = new UIController(
      document.body,
      {
        score: 0,
        beamSpeed: this.beamSpeed,
        rotationSensitivity: this.rotationSensitivity,
        maxSplits: this.maxSplits,
      },
      {
        onBeamSpeedChange: (v) => {
          this.beamSpeed = v;
          this.beamManager.setBeamSpeed(v);
        },
        onRotationSensitivityChange: (v) => {
          this.rotationSensitivity = v;
          this.mirrorManager.setRotationSensitivity(v);
        },
        onMaxSplitsChange: (v) => {
          this.maxSplits = v;
          this.beamManager.setMaxSplits(v);
        },
        onReset: () => this.triggerReset(),
      }
    );

    this.bindEvents();
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.receiverX = this.width - 50;
    this.receiverY = this.height - 50;
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.resize();
      this.mirrorManager.resize(this.width, this.height);
      this.beamManager.resize(this.width, this.height);
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('mousedown', (e) => {
      if (this.fadeDirection !== 0) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.mirrorManager.handleMouseDown(x, y, e.button);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.mirrorManager.handleMouseMove(x, y);
    });

    window.addEventListener('mouseup', () => {
      this.mirrorManager.handleMouseUp();
    });
  }

  private triggerReset(): void {
    this.pendingReset = true;
    this.fadeDirection = 1;
    this.fadeAlpha = 0;
  }

  private performReset(): void {
    this.mirrorManager.reset();
    this.beamManager.reset();
    this.ui.resetScore();
    this.receiverPulse = 0;
  }

  private updateFade(dt: number): void {
    if (this.fadeDirection === 0) return;

    const speed = 1 / 0.3;
    this.fadeAlpha += this.fadeDirection * speed * dt;

    if (this.fadeDirection > 0 && this.fadeAlpha >= 1) {
      this.fadeAlpha = 1;
      this.fadeDirection = -1;
      this.performReset();
    } else if (this.fadeDirection < 0 && this.fadeAlpha <= 0) {
      this.fadeAlpha = 0;
      this.fadeDirection = 0;
      this.pendingReset = false;
    }
  }

  private updateReceiver(dt: number, hitColors: string[]): void {
    if (hitColors.length > 0) {
      const unique = [...new Set(hitColors)];
      const score = 10 + Math.max(0, unique.length - 1) * 5;
      this.ui.addScore(score);
      this.receiverPulse = 1;
    }
    this.receiverPulse = Math.max(0, this.receiverPulse - dt * 2);
  }

  private drawBackground(): void {
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#0a0a14');
    grad.addColorStop(1, '#14142a');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawReceiver(): void {
    const pulseScale = 1 + this.receiverPulse * 0.2;
    const r = RECEIVER_RADIUS * pulseScale;

    this.ctx.save();
    this.ctx.translate(this.receiverX, this.receiverY);

    const grad = this.ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    grad.addColorStop(0, '#ffab91');
    grad.addColorStop(1, '#ff8a65');

    this.ctx.shadowColor = '#ff8a65';
    this.ctx.shadowBlur = 25 + this.receiverPulse * 20;

    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, r, Math.PI * 0.5, -Math.PI * 0.5);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.strokeStyle = '#ffccbc';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawFade(): void {
    if (this.fadeAlpha <= 0) return;
    this.ctx.save();
    this.ctx.globalAlpha = this.fadeAlpha;
    this.ctx.fillStyle = '#0a0a14';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();
  }

  private update(dt: number): void {
    this.updateFade(dt);
    if (this.fadeDirection > 0) return;

    this.mirrorManager.update(dt);
    this.beamManager.setMirrors(this.mirrorManager.mirrors);

    const hitColors = this.beamManager.update(dt, this.receiverX, this.receiverY, RECEIVER_RADIUS);
    this.updateReceiver(dt, hitColors);
    this.ui.update(dt);
  }

  private render(): void {
    this.drawBackground();
    this.drawReceiver();
    this.mirrorManager.render(this.ctx);
    this.beamManager.render(this.ctx);
    this.drawFade();
  }

  private loop = (time: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.05, (time - this.lastTime) / 1000 || 0);
    this.lastTime = time;
    this.update(dt);
    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const game = new GameEngine('game-canvas');
    game.start();
  });
}
