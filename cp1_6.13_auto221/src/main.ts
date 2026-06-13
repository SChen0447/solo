import { gsap } from 'gsap';
import { ParticleSystem, type CollisionEvent } from './particles';
import { AudioSynthesizer, type NoteSpeed } from './audio';
import { UIController } from './ui';

interface PointerState {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  velocityX: number;
  velocityY: number;
  isDown: boolean;
  lastEmitTime: number;
}

interface CanvasOffset {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

const EMIT_COOLDOWN = 16;
const OFFSET_DAMPING = 0.1;
const OFFSET_RETURN = 0.08;

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number = 1;
  private width: number = 0;
  private height: number = 0;

  private particleSystem: ParticleSystem;
  private audio: AudioSynthesizer;

  private pointer: PointerState = {
    x: 0,
    y: 0,
    prevX: 0,
    prevY: 0,
    velocityX: 0,
    velocityY: 0,
    isDown: false,
    lastEmitTime: 0
  };

  private canvasOffset: CanvasOffset = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0
  };

  private audioReady: boolean = false;
  private animationFrameId: number = 0;
  private lastTime: number = 0;
  private fpsAccumulator: number = 0;
  private fpsFrames: number = 0;

  constructor() {
    const canvasEl = document.getElementById('canvas');
    if (!canvasEl) {
      throw new Error('Canvas 元素未找到');
    }
    this.canvas = canvasEl as HTMLCanvasElement;
    const ctxResult = this.canvas.getContext('2d');
    if (!ctxResult) {
      throw new Error('无法获取 Canvas 2D 上下文');
    }
    this.ctx = ctxResult;

    this.resizeCanvas();

    this.particleSystem = new ParticleSystem({
      density: 200,
      saturation: 100,
      canvasWidth: this.width,
      canvasHeight: this.height
    });

    this.audio = new AudioSynthesizer({
      speed: 2,
      masterVolume: 0.45
    });

    new UIController({
      onDensityChange: (v) => this.handleDensityChange(v),
      onSpeedChange: (v) => this.handleSpeedChange(v),
      onSaturationChange: (v) => this.handleSaturationChange(v)
    });

    this.particleSystem.setOnCollision((e) => this.handleParticleCollision(e));

    this.bindEvents();
  }

  private resizeCanvas(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.particleSystem) {
      this.particleSystem.setParams({
        canvasWidth: this.width,
        canvasHeight: this.height
      });
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resizeCanvas());

    this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => this.onPointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => this.onPointerUp());

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onPointerDown(t.clientX, t.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this.onPointerMove(t.clientX, t.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.onPointerUp();
    }, { passive: false });

    const startAudio = async () => {
      if (!this.audioReady) {
        try {
          await this.audio.init();
          this.audioReady = true;
        } catch (err) {
          console.warn('音频初始化失败:', err);
        }
      }
    };
    this.canvas.addEventListener('pointerdown', startAudio, { once: true });
    window.addEventListener('keydown', startAudio, { once: true });
  }

  private onPointerDown(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.prevX = x;
    this.pointer.prevY = y;
    this.pointer.velocityX = 0;
    this.pointer.velocityY = 0;
    this.pointer.isDown = true;

    this.particleSystem.explode(x, y);

    if (this.audioReady) {
      this.audio.triggerExplosionBurst(x, y, this.width, this.height);
    }
  }

  private onPointerMove(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    this.pointer.prevX = this.pointer.x;
    this.pointer.prevY = this.pointer.y;
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.velocityX = x - this.pointer.prevX;
    this.pointer.velocityY = y - this.pointer.prevY;

    if (this.pointer.isDown) {
      const now = performance.now();
      if (now - this.pointer.lastEmitTime >= EMIT_COOLDOWN) {
        this.pointer.lastEmitTime = now;
        const vx = this.pointer.velocityX;
        const vy = this.pointer.velocityY;
        this.particleSystem.emit(x, y, vx, vy);
        this.particleSystem.emit(
          x + (Math.random() - 0.5) * 10,
          y + (Math.random() - 0.5) * 10,
          vx * 0.7 + (Math.random() - 0.5) * 2,
          vy * 0.7 + (Math.random() - 0.5) * 2
        );
      }
    }
  }

  private onPointerUp(): void {
    this.pointer.isDown = false;
  }

  private handleDensityChange(value: number): void {
    this.particleSystem.setParams({ density: value });
  }

  private handleSpeedChange(value: NoteSpeed): void {
    this.audio.setSpeed(value);
  }

  private handleSaturationChange(value: number): void {
    this.particleSystem.setParams({ saturation: value });
    this.particleSystem.refreshAllColors();
  }

  private handleParticleCollision(event: CollisionEvent): void {
    if (this.audioReady) {
      this.audio.triggerCollisionNote(event.x, event.y, this.width, this.height);
    }
  }

  private updateCanvasOffset(): void {
    if (this.pointer.isDown) {
      const speed = Math.hypot(this.pointer.velocityX, this.pointer.velocityY);
      const strength = Math.min(speed / 20, 1);
      const angle = Math.atan2(this.pointer.velocityY, this.pointer.velocityX);
      this.canvasOffset.targetX = -Math.cos(angle) * speed * 0.1 * strength;
      this.canvasOffset.targetY = -Math.sin(angle) * speed * 0.1 * strength;
    } else {
      this.canvasOffset.targetX *= 0.92;
      this.canvasOffset.targetY *= 0.92;
    }
    this.canvasOffset.x += (this.canvasOffset.targetX - this.canvasOffset.x) * (this.pointer.isDown ? OFFSET_DAMPING : OFFSET_RETURN);
    this.canvasOffset.y += (this.canvasOffset.targetY - this.canvasOffset.y) * (this.pointer.isDown ? OFFSET_DAMPING : OFFSET_RETURN);
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#0f0c29');
    grad.addColorStop(1, '#302b63');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 137.5) % this.width);
      const sy = ((i * 89.3) % this.height);
      const sr = 0.6 + (i % 5) * 0.3;
      ctx.beginPath();
      ctx.fillStyle = '#ffffff';
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private render(now: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();

    ctx.save();
    ctx.translate(this.canvasOffset.x, this.canvasOffset.y);
    this.particleSystem.render(ctx, now);
    ctx.restore();

    if (this.pointer.isDown) {
      ctx.save();
      const pulse = 0.5 + Math.sin(now * 0.01) * 0.2;
      const grad = ctx.createRadialGradient(
        this.pointer.x + this.canvasOffset.x,
        this.pointer.y + this.canvasOffset.y,
        0,
        this.pointer.x + this.canvasOffset.x,
        this.pointer.y + this.canvasOffset.y,
        24
      );
      grad.addColorStop(0, `rgba(200, 180, 255, ${0.35 * pulse})`);
      grad.addColorStop(1, 'rgba(100, 80, 200, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.pointer.x + this.canvasOffset.x, this.pointer.y + this.canvasOffset.y, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private loop = (timestamp: number): void => {
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.fpsAccumulator += dt;
    this.fpsFrames++;
    if (this.fpsAccumulator >= 1000) {
      const fps = Math.round((this.fpsFrames * 1000) / this.fpsAccumulator);
      if (fps < 40) {
        console.warn(`帧率较低: ${fps} FPS`);
      }
      this.fpsAccumulator = 0;
      this.fpsFrames = 0;
    }

    this.updateCanvasOffset();
    this.particleSystem.update(timestamp);
    this.render(timestamp);

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  start(): void {
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop);
    gsap.fromTo(
      '#ui-panel',
      { opacity: 0, y: -10 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.2 }
    );
  }

  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.audio.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const app = new App();
    app.start();
  } catch (err) {
    console.error('应用启动失败:', err);
  }
});
