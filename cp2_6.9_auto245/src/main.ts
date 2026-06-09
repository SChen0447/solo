import { Controls, KaleidoscopeParams } from './controls';
import { KaleidoscopeRenderer } from './kaleidoscope';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

interface Ripple {
  radius: number;
  maxRadius: number;
  alpha: number;
}

const MIN_WIDTH = 600;
const MIN_HEIGHT = 600;

class KaleidoscopeApp {
  private canvas: HTMLCanvasElement;
  private renderer: KaleidoscopeRenderer;
  private controls: Controls;

  private width: number = 0;
  private height: number = 0;
  private centerX: number = 0;
  private centerY: number = 0;

  private mouseX: number = 0;
  private mouseY: number = 0;

  private currentParams: KaleidoscopeParams = { axes: 6, colorRotation: 0, scale: 1.0 };
  private colorStops: string[];

  private isLocked: boolean = false;

  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragStartAxes: number = 6;
  private dragStartColorRotation: number = 0;

  private particles: Particle[] = [];
  private ripples: Ripple[] = [];

  private extraRotation: number = 0;
  private extraScale: number = 1;
  private fadeAlpha: number = 1;

  private animatingLock: boolean = false;
  private lockAnimTime: number = 0;
  private lockAnimDuration: number = 0.3;
  private lockAnimDirection: number = 1;

  private animatingFade: boolean = false;
  private fadeAnimTime: number = 0;
  private fadeAnimDuration: number = 0.5;
  private fadePhase: 'out' | 'in' = 'out';

  private animatingRipple: boolean = false;

  private lastTime: number = 0;

  private tempParticle: Particle = {
    x: 0, y: 0, vx: 0, vy: 0, size: 0, color: '', life: 0, maxLife: 0
  };

  constructor() {
    this.canvas = document.getElementById('kaleidoscope-canvas') as HTMLCanvasElement;
    const panel = document.getElementById('controls-panel') as HTMLElement;

    if (!this.canvas || !panel) {
      throw new Error('Required DOM elements not found');
    }

    this.renderer = new KaleidoscopeRenderer(this.canvas);
    this.colorStops = this.renderer.getDefaultColorStops();

    this.controls = new Controls(panel, {
      onParamsChange: (params) => {
        this.currentParams = params;
      },
      onReset: () => {
        this.startFadeAnimation();
      }
    });

    this.currentParams = this.controls.getCurrentParams();

    this.setupResize();
    this.setupMouseEvents();
    this.setupKeyboardEvents();

    this.resize();
    this.mouseX = this.centerX;
    this.mouseY = this.centerY;

    this.start();
  }

  private setupResize(): void {
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const w = Math.max(MIN_WIDTH, window.innerWidth);
    const h = Math.max(MIN_HEIGHT, window.innerHeight);
    this.width = w;
    this.height = h;
    this.centerX = w / 2;
    this.centerY = h / 2;
    this.renderer.resize(w, h);

    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
  }

  private setupMouseEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;

      if (this.isDragging && !this.isLocked) {
        const dx = this.mouseX - this.dragStartX;
        const dy = this.mouseY - this.dragStartY;

        const axesDelta = Math.round(dx / 50);
        const newAxes = this.dragStartAxes + axesDelta;
        this.controls.setAxesFromDrag(newAxes);

        const colorDelta = Math.round(dy / 20) * 2;
        const newColor = this.dragStartColorRotation + colorDelta;
        this.controls.setColorRotationFromDrag(newColor);
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (this.isLocked) return;

      this.isDragging = true;
      this.dragStartX = this.mouseX;
      this.dragStartY = this.mouseY;
      this.dragStartAxes = this.currentParams.axes;
      this.dragStartColorRotation = this.currentParams.colorRotation;
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button !== 0) return;

      if (this.isDragging) {
        this.isDragging = false;
        this.spawnParticles(this.mouseX, this.mouseY);
      }
    });

    this.canvas.addEventListener('click', () => {
      if (this.animatingLock) return;

      if (!this.isDragging || this.isLocked) {
        this.toggleLock();
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      if (this.isDragging) {
        this.isDragging = false;
      }
    });
  }

  private setupKeyboardEvents(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'r' && !this.isLocked) {
        this.colorStops = this.renderer.generateRandomColorStops();
        this.startRippleAnimation();
      }
    });
  }

  private toggleLock(): void {
    this.isLocked = !this.isLocked;
    this.controls.setDisabled(this.isLocked);

    if (!this.isLocked) {
      this.animatingLock = true;
      this.lockAnimTime = 0;
      this.lockAnimDirection = Math.random() > 0.5 ? 1 : -1;
    }
  }

  private spawnParticles(x: number, y: number): void {
    const count = 40;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 200;
      const size = 2 + Math.random() * 4;
      const color = this.colorStops[Math.floor(Math.random() * this.colorStops.length)];
      const maxLife = 0.5;

      if (this.particles.length < 200) {
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 100,
          size,
          color,
          life: maxLife,
          maxLife
        });
      } else {
        this.tempParticle.x = x;
        this.tempParticle.y = y;
        this.tempParticle.vx = Math.cos(angle) * speed;
        this.tempParticle.vy = Math.sin(angle) * speed - 100;
        this.tempParticle.size = size;
        this.tempParticle.color = color;
        this.tempParticle.life = maxLife;
        this.tempParticle.maxLife = maxLife;
        this.particles[i % this.particles.length] = { ...this.tempParticle };
      }
    }
  }

  private startRippleAnimation(): void {
    this.ripples.length = 0;
    for (let i = 0; i < 3; i++) {
      this.ripples.push({
        radius: 0,
        maxRadius: 30 + i * 40,
        alpha: 0.3
      });
    }
    this.animatingRipple = true;
  }

  private startFadeAnimation(): void {
    this.animatingFade = true;
    this.fadeAnimTime = 0;
    this.fadePhase = 'out';
  }

  private updateLockAnimation(dt: number): void {
    if (!this.animatingLock) return;

    this.lockAnimTime += dt;
    const t = Math.min(1, this.lockAnimTime / this.lockAnimDuration);

    if (t < 0.5) {
      const subT = t * 2;
      this.extraRotation = (Math.PI / 2) * this.lockAnimDirection * subT;
      this.extraScale = 1 - 0.5 * subT;
    } else {
      const subT = (t - 0.5) * 2;
      this.extraRotation = (Math.PI / 2) * this.lockAnimDirection * (1 - subT);
      this.extraScale = 0.5 + 0.5 * subT;
    }

    if (t >= 1) {
      this.animatingLock = false;
      this.extraRotation = 0;
      this.extraScale = 1;
    }
  }

  private updateFadeAnimation(dt: number): void {
    if (!this.animatingFade) return;

    this.fadeAnimTime += dt;
    const t = this.fadeAnimTime / this.fadeAnimDuration;

    if (this.fadePhase === 'out') {
      this.fadeAlpha = 1 - t;
      if (t >= 1) {
        this.fadePhase = 'in';
        this.fadeAnimTime = 0;
        this.colorStops = this.renderer.generateRandomColorStops();
      }
    } else {
      this.fadeAlpha = t;
      if (t >= 1) {
        this.animatingFade = false;
        this.fadeAlpha = 1;
      }
    }
  }

  private updateRipples(dt: number): void {
    if (!this.animatingRipple) return;

    let allDone = true;
    for (let i = 0; i < this.ripples.length; i++) {
      const ripple = this.ripples[i];
      if (ripple.radius < ripple.maxRadius) {
        ripple.radius += (10 / 0.33) * dt;
        ripple.alpha = 0.3 * (1 - ripple.radius / ripple.maxRadius);
        allDone = false;
      }
    }

    if (allDone) {
      this.animatingRipple = false;
    }
  }

  private updateParticles(dt: number): void {
    const gravity = 400;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.vy += gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  private renderParticles(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const alpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderRipples(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    for (let i = 0; i < this.ripples.length; i++) {
      const r = this.ripples[i];
      if (r.radius <= 0) continue;
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#FFFFFF';
      ctx.globalAlpha = r.alpha;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private start(): void {
    this.lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;

      this.updateLockAnimation(dt);
      this.updateFadeAnimation(dt);
      this.updateRipples(dt);
      this.updateParticles(dt);

      this.renderer.render({
        axes: this.currentParams.axes,
        colorRotation: this.currentParams.colorRotation,
        scale: this.currentParams.scale,
        mouseX: this.mouseX,
        mouseY: this.mouseY,
        centerX: this.centerX,
        centerY: this.centerY,
        colorStops: this.colorStops,
        extraRotation: this.extraRotation,
        extraScale: this.extraScale,
        fadeAlpha: this.fadeAlpha
      });

      this.renderParticles();
      this.renderRipples();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new KaleidoscopeApp();
});
