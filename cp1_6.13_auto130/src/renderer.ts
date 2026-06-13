import { ParticleSystem, ImageryEffect } from './particleSystem';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;
  private bgGradient: CanvasGradient | null = null;
  private lastTime: number = 0;
  private animFrameId: number = 0;
  private particleSystem: ParticleSystem;
  private isDragging: boolean = false;
  private hasDragged: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private hoveredParticle: ReturnType<ParticleSystem['hitTest']> = null;

  constructor(canvas: HTMLCanvasElement, particleSystem: ParticleSystem) {
    this.canvas = canvas;
    this.particleSystem = particleSystem;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    this.ctx = ctx;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this._resize();
    this._bindEvents();
  }

  private _resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.particleSystem.updateCenter(this.width / 2, this.height / 2);

    this.bgGradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    this.bgGradient.addColorStop(0, '#0b0b1a');
    this.bgGradient.addColorStop(1, '#1a1a2e');
  }

  private _bindEvents() {
    window.addEventListener('resize', () => this._resize());

    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.hasDragged = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;

      if (this.isDragging) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        const totalDx = e.clientX - this.dragStartX;
        const totalDy = e.clientY - this.dragStartY;
        if (Math.abs(totalDx) > 3 || Math.abs(totalDy) > 3) {
          this.hasDragged = true;
        }
        this.particleSystem.rotY += dx * 0.005 * this.particleSystem.rotSensitivity;
        this.particleSystem.rotX += dy * 0.005 * this.particleSystem.rotSensitivity;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      } else {
        this.hoveredParticle = this.particleSystem.hitTest(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.hasDragged) return;
      const particle = this.particleSystem.hitTest(e.clientX, e.clientY);
      if (particle) {
        this.particleSystem.triggerImagery(particle, performance.now());
      }
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      this.particleSystem.zoom = Math.max(0.3, Math.min(3, this.particleSystem.zoom + delta));
    }, { passive: false });

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.hasDragged = false;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length === 1) {
        this.hasDragged = true;
        const dx = e.touches[0].clientX - this.lastMouseX;
        const dy = e.touches[0].clientY - this.lastMouseY;
        this.particleSystem.rotY += dx * 0.005 * this.particleSystem.rotSensitivity;
        this.particleSystem.rotX += dy * 0.005 * this.particleSystem.rotSensitivity;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', (e) => {
      if (!this.hasDragged && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const particle = this.particleSystem.hitTest(touch.clientX, touch.clientY);
        if (particle) {
          this.particleSystem.triggerImagery(particle, performance.now());
        }
      }
      this.isDragging = false;
    });
  }

  start() {
    this.lastTime = performance.now();
    this._loop();
  }

  stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private _loop() {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.particleSystem.update(dt, now);
    this._render(now);

    this.animFrameId = requestAnimationFrame(() => this._loop());
  }

  private _render(now: number) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    if (this.bgGradient) {
      ctx.fillStyle = this.bgGradient;
      ctx.fillRect(0, 0, w, h);
    }

    this._drawStarsBackground(ctx, w, h, now);

    const sorted = this.particleSystem.getSortedParticles();

    for (const { particle, screenX, screenY, scale } of sorted) {
      const fontSize = Math.max(8, Math.min(48, particle.baseFontSize * scale));
      const isHovered = particle === this.hoveredParticle;
      const displaySize = isHovered || particle.isAnimating ? fontSize * 2 : fontSize;

      const displayHue = particle.isAnimating ? 0 : particle.hue;
      const displaySat = particle.isAnimating ? 0 : particle.saturation;
      const displayLight = particle.isAnimating ? 100 : particle.lightness;

      if (this.isDragging) {
        ctx.globalAlpha = particle.alpha * 0.9;
        const angle = particle.rotation;
        const trailDx = Math.cos(angle) * 5;
        const trailDy = Math.sin(angle) * 5;
        ctx.font = `${displaySize}px 'Roboto Mono', monospace`;
        ctx.fillStyle = `hsla(${displayHue}, ${displaySat}%, ${displayLight}%, 0.1)`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(particle.char, screenX - trailDx, screenY - trailDy);
      }

      ctx.globalAlpha = particle.alpha;
      ctx.save();
      ctx.translate(screenX, screenY);
      ctx.rotate(particle.rotation);

      ctx.font = `${displaySize}px 'Roboto Mono', monospace`;
      ctx.fillStyle = `hsl(${displayHue}, ${displaySat}%, ${displayLight}%)`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (particle.isAnimating) {
        ctx.shadowColor = `hsl(${particle.savedHue}, ${particle.savedSaturation}%, ${particle.savedLightness}%)`;
        ctx.shadowBlur = 20;
      }

      ctx.fillText(particle.char, 0, 0);

      if (isHovered && !particle.isAnimating) {
        ctx.strokeStyle = `hsla(${displayHue}, ${displaySat}%, ${displayLight}%, 0.4)`;
        ctx.lineWidth = 1;
        const r = displaySize * 0.6;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1;

    this._drawEffects(ctx, now);
  }

  private _drawStarsBackground(ctx: CanvasRenderingContext2D, w: number, h: number, now: number) {
    const seed = 42;
    for (let i = 0; i < 80; i++) {
      const pseudoRand = this._pseudoRandom(seed + i);
      const x = pseudoRand * w;
      const y = this._pseudoRandom(seed + i + 1000) * h;
      const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(now * 0.001 + i * 0.5));
      const size = 0.5 + this._pseudoRandom(seed + i + 2000) * 1.5;
      ctx.globalAlpha = twinkle * 0.4;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private _pseudoRandom(seed: number): number {
    const x = Math.sin(seed * 127.1) * 43758.5453;
    return x - Math.floor(x);
  }

  private _drawEffects(ctx: CanvasRenderingContext2D, now: number) {
    for (const effect of this.particleSystem.effects) {
      const elapsed = now - effect.startTime;
      const progress = elapsed / effect.duration;

      if (effect.type === 'rain') {
        this._drawRainEffect(ctx, effect, progress);
      } else if (effect.type === 'fire') {
        this._drawFireEffect(ctx, effect, progress);
      } else {
        this._drawStarsEffectParticles(ctx, effect, progress);
      }
    }
  }

  private _drawRainEffect(ctx: CanvasRenderingContext2D, effect: ImageryEffect, progress: number) {
    for (const ep of effect.particles) {
      const a = ep.alpha * (1 - progress);
      ctx.globalAlpha = a;
      ctx.fillStyle = `rgba(100, 150, 255, ${a})`;
      ctx.beginPath();
      ctx.ellipse(ep.x, ep.y, ep.size / 2, ep.size, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private _drawFireEffect(ctx: CanvasRenderingContext2D, effect: ImageryEffect, progress: number) {
    const glowAlpha = (1 - progress) * 0.4;
    ctx.globalAlpha = glowAlpha;
    const gradient = ctx.createRadialGradient(effect.cx, effect.cy, 0, effect.cx, effect.cy, 50);
    gradient.addColorStop(0, `rgba(255, 150, 50, ${glowAlpha})`);
    gradient.addColorStop(1, 'rgba(255, 80, 20, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(effect.cx, effect.cy, 50, 0, Math.PI * 2);
    ctx.fill();

    for (const ep of effect.particles) {
      const a = ep.alpha * (1 - progress);
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(ep.x, ep.y);
      ctx.rotate(ep.rotation);
      ctx.fillStyle = `rgba(255, ${50 + Math.random() * 100 | 0}, 20, ${a})`;
      ctx.beginPath();
      const s = ep.size / 2;
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.866, s * 0.5);
      ctx.lineTo(-s * 0.866, s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private _drawStarsEffectParticles(ctx: CanvasRenderingContext2D, effect: ImageryEffect, progress: number) {
    for (const ep of effect.particles) {
      const a = ep.alpha * (1 - progress);
      ctx.globalAlpha = a;
      ctx.fillStyle = `rgba(255, 215, 0, ${a})`;
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, ep.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = a * 0.3;
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, ep.size * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
