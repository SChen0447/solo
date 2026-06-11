import { Firefly, Vec2 } from './firefly';
import { BoidsEngine } from './boids';
import { Mushroom } from './mushroom';

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  phase: number;
  speed: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  duration: number;
  elapsed: number;
}

class FireflyApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  private fireflies: Firefly[] = [];
  private mushrooms: Mushroom[] = [];
  private stars: Star[] = [];
  private ripples: Ripple[] = [];

  private boidsEngine: BoidsEngine;

  private targetDensity: number = 100;
  private cohesionStrength: number = 0.5;
  private trailLength: number = 50;

  private lastTime: number = 0;
  private animationFrameId: number = 0;

  private fps: number = 0;
  private fpsAccumulator: number = 0;
  private fpsFrameCount: number = 0;
  private fpsUpdateInterval: number = 500;

  private draggingMushroom: Mushroom | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;

  private isDensityAdjusting: boolean = false;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = ctx;

    this.boidsEngine = new BoidsEngine({}, { cohesion: this.cohesionStrength });

    this.init();
  }

  private init(): void {
    this.setupCanvas();
    this.createStars();
    this.createFireflies(this.targetDensity);
    this.bindEvents();
    this.lastTime = performance.now();
    this.animate();
  }

  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(dpr, dpr);
  }

  private createStars(): void {
    this.stars = [];
    const starCount = Math.floor((this.width * this.height) / 8000);

    for (let i = 0; i < starCount; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 1 + Math.random() * 2,
        baseAlpha: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5,
      });
    }
  }

  private createFireflies(count: number): void {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      this.fireflies.push(new Firefly(x, y, this.trailLength, false));
    }
  }

  private addFirefly(fadeIn: boolean = true): void {
    const x = Math.random() * this.width;
    const y = Math.random() * this.height;
    this.fireflies.push(new Firefly(x, y, this.trailLength, fadeIn));
  }

  private removeFirefly(): void {
    const aliveFireflies = this.fireflies.filter(f => !f.isDead && f.fadeDirection === 0);
    if (aliveFireflies.length > 0) {
      const randomIndex = Math.floor(Math.random() * aliveFireflies.length);
      aliveFireflies[randomIndex].startFadeOut();
    }
  }

  private updateDensity(): void {
    const aliveCount = this.fireflies.filter(f => !f.isDead).length;

    if (aliveCount < this.targetDensity) {
      const toAdd = Math.min(2, this.targetDensity - aliveCount);
      for (let i = 0; i < toAdd; i++) {
        this.addFirefly(true);
      }
    } else if (aliveCount > this.targetDensity) {
      const toRemove = Math.min(2, aliveCount - this.targetDensity);
      for (let i = 0; i < toRemove; i++) {
        this.removeFirefly();
      }
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize());

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());

    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', () => this.onTouchEnd());

    const densitySlider = document.getElementById('density-slider') as HTMLInputElement;
    const cohesionSlider = document.getElementById('cohesion-slider') as HTMLInputElement;
    const trailSlider = document.getElementById('trail-slider') as HTMLInputElement;
    const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

    densitySlider.addEventListener('input', (e) => {
      this.targetDensity = parseInt((e.target as HTMLInputElement).value);
      this.updateDensityValue(this.targetDensity);
    });

    cohesionSlider.addEventListener('input', (e) => {
      this.cohesionStrength = parseInt((e.target as HTMLInputElement).value) / 100;
      this.boidsEngine.setCohesionStrength(this.cohesionStrength);
      this.updateCohesionValue(this.cohesionStrength);
    });

    trailSlider.addEventListener('input', (e) => {
      this.trailLength = parseInt((e.target as HTMLInputElement).value);
      this.updateTrailValue(this.trailLength);
      for (const firefly of this.fireflies) {
        firefly.maxTrailLength = this.trailLength;
      }
    });

    resetBtn.addEventListener('click', () => this.reset());
  }

  private updateDensityValue(value: number): void {
    const el = document.getElementById('density-value');
    if (el) el.textContent = value.toString();
  }

  private updateCohesionValue(value: number): void {
    const el = document.getElementById('cohesion-value');
    if (el) el.textContent = value.toFixed(1);
  }

  private updateTrailValue(value: number): void {
    const el = document.getElementById('trail-value');
    if (el) el.textContent = `${value}px`;
  }

  private onResize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);

    this.createStars();
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    this.mouseX = coords.x;
    this.mouseY = coords.y;

    const mushroom = this.findMushroomAt(coords.x, coords.y);
    if (mushroom) {
      this.draggingMushroom = mushroom;
      mushroom.startDrag(coords.x, coords.y);
    } else {
      this.addMushroom(coords.x, coords.y);
      this.addRipple(coords.x, coords.y);
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    this.mouseX = coords.x;
    this.mouseY = coords.y;

    if (this.draggingMushroom) {
      this.draggingMushroom.updateDrag(coords.x, coords.y);
    }
  }

  private onMouseUp(): void {
    if (this.draggingMushroom) {
      this.draggingMushroom.endDrag();
      this.draggingMushroom = null;
    }
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const coords = this.getCanvasCoords(touch.clientX, touch.clientY);
      this.mouseX = coords.x;
      this.mouseY = coords.y;

      const mushroom = this.findMushroomAt(coords.x, coords.y);
      if (mushroom) {
        this.draggingMushroom = mushroom;
        mushroom.startDrag(coords.x, coords.y);
      } else {
        this.addMushroom(coords.x, coords.y);
        this.addRipple(coords.x, coords.y);
      }
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1 && this.draggingMushroom) {
      const touch = e.touches[0];
      const coords = this.getCanvasCoords(touch.clientX, touch.clientY);
      this.mouseX = coords.x;
      this.mouseY = coords.y;
      this.draggingMushroom.updateDrag(coords.x, coords.y);
    }
  }

  private onTouchEnd(): void {
    if (this.draggingMushroom) {
      this.draggingMushroom.endDrag();
      this.draggingMushroom = null;
    }
  }

  private findMushroomAt(x: number, y: number): Mushroom | null {
    for (let i = this.mushrooms.length - 1; i >= 0; i--) {
      if (this.mushrooms[i].containsPoint(x, y)) {
        return this.mushrooms[i];
      }
    }
    return null;
  }

  private addMushroom(x: number, y: number): void {
    const mushroom = new Mushroom({
      x,
      y,
      attractionWeight: 0.3,
      orbitRadius: 20,
      glowRadius: 30,
    });
    this.mushrooms.push(mushroom);
  }

  private addRipple(x: number, y: number): void {
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: 60,
      alpha: 0.8,
      duration: 600,
      elapsed: 0,
    });
  }

  private reset(): void {
    this.mushrooms = [];
    this.ripples = [];

    for (const firefly of this.fireflies) {
      firefly.startFadeOut();
    }

    setTimeout(() => {
      this.fireflies = this.fireflies.filter(f => !f.isDead);
      this.targetDensity = 100;

      const densitySlider = document.getElementById('density-slider') as HTMLInputElement;
      const cohesionSlider = document.getElementById('cohesion-slider') as HTMLInputElement;
      const trailSlider = document.getElementById('trail-slider') as HTMLInputElement;

      if (densitySlider) densitySlider.value = '100';
      if (cohesionSlider) cohesionSlider.value = '50';
      if (trailSlider) trailSlider.value = '50';

      this.cohesionStrength = 0.5;
      this.boidsEngine.setCohesionStrength(this.cohesionStrength);
      this.trailLength = 50;

      this.updateDensityValue(100);
      this.updateCohesionValue(0.5);
      this.updateTrailValue(50);

      this.createFireflies(100);
    }, 500);
  }

  private update(deltaTime: number): void {
    this.updateDensity();

    for (const mushroom of this.mushrooms) {
      mushroom.update(deltaTime);
    }

    for (const firefly of this.fireflies) {
      if (firefly.isDead) continue;

      const boidsAccel = this.boidsEngine.computeAcceleration(firefly, this.fireflies);

      let totalAccel: Vec2 = { x: boidsAccel.x, y: boidsAccel.y };

      for (const mushroom of this.mushrooms) {
        const attraction = mushroom.getAttractionForce(firefly.x, firefly.y);
        totalAccel.x += attraction.x;
        totalAccel.y += attraction.y;
      }

      const accelMag = Math.sqrt(totalAccel.x * totalAccel.x + totalAccel.y * totalAccel.y);
      const maxAccel = 0.2;
      if (accelMag > maxAccel) {
        totalAccel.x = (totalAccel.x / accelMag) * maxAccel;
        totalAccel.y = (totalAccel.y / accelMag) * maxAccel;
      }

      firefly.update(deltaTime, totalAccel, this.width, this.height);
    }

    this.fireflies = this.fireflies.filter(f => !f.isDead);

    for (const star of this.stars) {
      star.phase += deltaTime * 0.001 * star.speed;
      if (star.phase > Math.PI * 2) {
        star.phase -= Math.PI * 2;
      }
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      ripple.elapsed += deltaTime;

      const t = ripple.elapsed / ripple.duration;
      ripple.radius = ripple.maxRadius * t;
      ripple.alpha = 0.8 * (1 - t);

      if (ripple.elapsed >= ripple.duration) {
        this.ripples.splice(i, 1);
      }
    }

    this.updateFPS(deltaTime);
  }

  private updateFPS(deltaTime: number): void {
    this.fpsAccumulator += deltaTime;
    this.fpsFrameCount++;

    if (this.fpsAccumulator >= this.fpsUpdateInterval) {
      this.fps = Math.round((this.fpsFrameCount / this.fpsAccumulator) * 1000);
      this.fpsAccumulator = 0;
      this.fpsFrameCount = 0;

      const fpsEl = document.getElementById('fps-counter');
      if (fpsEl) {
        fpsEl.textContent = `${this.fps} FPS`;
      }
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2,
      this.height * 0.65,
      0,
      this.width / 2,
      this.height * 0.5,
      Math.max(this.width, this.height) * 0.7
    );
    gradient.addColorStop(0, '#0a2e1a');
    gradient.addColorStop(0.3, '#06200f');
    gradient.addColorStop(0.6, '#031808');
    gradient.addColorStop(1, '#000805');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawStars(): void {
    for (const star of this.stars) {
      const alpha = star.baseAlpha * (0.5 + 0.5 * Math.sin(star.phase));

      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.fill();
    }
  }

  private drawRipples(): void {
    for (const ripple of this.ripples) {
      this.ctx.beginPath();
      this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(100, 255, 150, ${ripple.alpha})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      const innerGradient = this.ctx.createRadialGradient(
        ripple.x, ripple.y, 0,
        ripple.x, ripple.y, ripple.radius
      );
      innerGradient.addColorStop(0, `rgba(100, 255, 150, ${ripple.alpha * 0.3})`);
      innerGradient.addColorStop(1, 'rgba(100, 255, 150, 0)');

      this.ctx.beginPath();
      this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = innerGradient;
      this.ctx.fill();
    }
  }

  private drawMushrooms(): void {
    for (const mushroom of this.mushrooms) {
      mushroom.draw(this.ctx);
    }
  }

  private drawFireflies(): void {
    for (const firefly of this.fireflies) {
      firefly.draw(this.ctx);
    }
  }

  private render(): void {
    this.drawBackground();
    this.drawStars();
    this.drawRipples();
    this.drawMushrooms();
    this.drawFireflies();
  }

  private animate = (): void => {
    const currentTime = performance.now();
    const deltaTime = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  public start(): void {
    if (!this.animationFrameId) {
      this.lastTime = performance.now();
      this.animate();
    }
  }

  public stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new FireflyApp();
});
