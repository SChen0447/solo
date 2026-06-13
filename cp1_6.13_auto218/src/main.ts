import { Flock } from './flock';
import { Vortex } from './vortex';
import { gsap } from 'gsap';

interface Star {
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
  brightness: number;
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

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  private flock!: Flock;
  private vortex!: Vortex;

  private stars: Star[] = [];
  private ripples: Ripple[] = [];

  private mouseX: number = 0;
  private mouseY: number = 0;

  private score: number = 0;
  private scoreDisplay: number = 0;
  private scoreElement!: HTMLDivElement;
  private scoreScale: number = 1;

  private lastTime: number = 0;
  private animationId: number = 0;
  private running: boolean = false;

  private hintElement!: HTMLDivElement;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.init();
  }

  private init(): void {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.mouseX = this.width / 2;
    this.mouseY = this.height / 2;

    this.initStars();
    this.initFlock();
    this.initVortex();
    this.initUI();
    this.bindEvents();
  }

  private initStars(): void {
    this.stars = [];
    const count = 60;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1 + Math.random(),
        phase: Math.random() * Math.PI * 2,
        speed: (Math.PI * 2) / (3 + Math.random() * 2),
        brightness: 0.5 + Math.random() * 0.5,
      });
    }
  }

  private initFlock(): void {
    this.flock = new Flock({
      count: 60,
      centerX: this.width / 2,
      centerY: this.height / 2,
      spread: 100,
    });
  }

  private initVortex(): void {
    this.vortex = new Vortex(this.width / 2, this.height / 2, 5);
  }

  private initUI(): void {
    this.scoreElement = document.createElement('div');
    this.scoreElement.style.cssText = `
      position: fixed;
      top: 24px;
      right: 32px;
      color: #e0e0e0;
      font-family: 'Courier New', Courier, monospace;
      font-size: 28px;
      font-weight: bold;
      text-shadow: 0 0 8px rgba(224, 224, 224, 0.8), 0 0 16px rgba(162, 155, 254, 0.5);
      pointer-events: none;
      z-index: 10;
      letter-spacing: 2px;
      transform-origin: right center;
    `;
    this.scoreElement.textContent = '得分: 0';
    document.body.appendChild(this.scoreElement);

    this.hintElement = document.createElement('div');
    this.hintElement.style.cssText = `
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%);
      color: #e0e0e0;
      font-family: 'Courier New', Courier, monospace;
      font-size: 14px;
      text-shadow: 0 0 6px rgba(224, 224, 224, 0.6);
      pointer-events: none;
      z-index: 10;
      opacity: 0.7;
      letter-spacing: 1px;
      text-align: center;
    `;
    this.hintElement.innerHTML = '移动鼠标引导鸟群 · 点击鼠标散开聚拢';
    document.body.appendChild(this.hintElement);

    setTimeout(() => {
      gsap.to(this.hintElement, { opacity: 0, duration: 1, delay: 4 });
    }, 100);
  }

  private bindEvents(): void {
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.flock.setTarget(this.mouseX, this.mouseY);
    });

    window.addEventListener('click', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.flock.scatter();
      this.addRipple(e.clientX, e.clientY);
    });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.mouseX = e.touches[0].clientX;
        this.mouseY = e.touches[0].clientY;
        this.flock.setTarget(this.mouseX, this.mouseY);
      }
    }, { passive: true });

    window.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.mouseX = e.touches[0].clientX;
        this.mouseY = e.touches[0].clientY;
        this.flock.scatter();
        this.addRipple(this.mouseX, this.mouseY);
      }
    }, { passive: true });
  }

  private addRipple(x: number, y: number): void {
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: 200,
      alpha: 0.6,
      duration: 1,
      elapsed: 0,
    });
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

    if (this.vortex) {
      this.vortex.resize(this.width / 2, this.height / 2);
    }
    if (this.flock) {
      this.flock.setTarget(this.width / 2, this.height / 2);
    }
    if (this.stars.length > 0) {
      this.initStars();
    }
  }

  private update(dt: number): void {
    this.flock.update(dt);

    const collisionScore = this.vortex.update(dt, this.flock.birds);
    if (collisionScore > 0) {
      this.addScore(collisionScore);
    }

    for (const star of this.stars) {
      star.phase += star.speed * dt;
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      ripple.elapsed += dt;
      const progress = ripple.elapsed / ripple.duration;
      if (progress >= 1) {
        this.ripples.splice(i, 1);
      } else {
        ripple.radius = ripple.maxRadius * progress;
        ripple.alpha = 0.6 * (1 - progress);
      }
    }

    if (Math.abs(this.scoreDisplay - this.score) > 0.5) {
      this.scoreDisplay += (this.score - this.scoreDisplay) * 0.15 * dt * 60;
      this.updateScoreUI();
    }
  }

  private addScore(points: number): void {
    this.score += points;
    this.animateScore();
  }

  private animateScore(): void {
    gsap.killTweensOf(this, { scoreScale: true });
    this.scoreScale = 1;
    gsap.to(this, {
      scoreScale: 1.1,
      duration: 0.15,
      ease: 'elastic.out(1, 0.5)',
      yoyo: true,
      repeat: 1,
      onUpdate: () => {
        this.scoreElement.style.transform = `scale(${this.scoreScale})`;
      },
    });
  }

  private updateScoreUI(): void {
    this.scoreElement.textContent = `得分: ${Math.floor(this.scoreDisplay)}`;
  }

  private draw(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();
    this.drawStars();
    this.vortex.draw(this.ctx);
    this.flock.draw(this.ctx);
    this.drawRipples();
    this.drawCursor();
  }

  private drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7
    );
    gradient.addColorStop(0, '#0d0221');
    gradient.addColorStop(1, '#190b28');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawStars(): void {
    for (const star of this.stars) {
      const brightness = 0.3 + Math.sin(star.phase) * 0.35 + star.brightness * 0.35;
      this.ctx.save();
      this.ctx.globalAlpha = brightness;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowColor = '#a29bfe';
      this.ctx.shadowBlur = 6;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawRipples(): void {
    for (const ripple of this.ripples) {
      this.ctx.save();
      this.ctx.globalAlpha = ripple.alpha;
      this.ctx.strokeStyle = '#ff9ff3';
      this.ctx.shadowColor = '#ff9ff3';
      this.ctx.shadowBlur = 15;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private drawCursor(): void {
    this.ctx.save();
    this.ctx.strokeStyle = '#ff9ff3';
    this.ctx.shadowColor = '#ff9ff3';
    this.ctx.shadowBlur = 10;
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.arc(this.mouseX, this.mouseY, 8, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.fillStyle = '#ff9ff3';
    this.ctx.beginPath();
    this.ctx.arc(this.mouseX, this.mouseY, 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private loop = (time: number): void => {
    if (!this.running) return;

    const dt = Math.min((time - this.lastTime) / 1000, 1 / 30);
    this.lastTime = time;

    this.update(dt);
    this.draw();

    this.animationId = requestAnimationFrame(this.loop);
  };

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

const game = new Game();
game.start();
