import { Particle, MouseState } from './particle';
import { poems, Poem } from './poems';

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  alpha: number;
  twinkleSpeed: number;
  phase: number;
}

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private width: number = 0;
  private height: number = 0;

  private particles: Particle[] = [];
  private stars: Star[] = [];

  private mouse: MouseState = {
    x: 0,
    y: 0,
    isDown: false,
    forceStrength: 1.0
  };

  private particleSize: number = 24;
  private currentPoemIndex: number = 0;
  private lastTime: number = 0;

  private hGap: number = 32;
  private vGap: number = 50;
  private fontSize: number = 24;
  private cols: number = 5;

  private titleEl: HTMLElement | null;
  private authorEl: HTMLElement | null;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;

    this.titleEl = document.getElementById('poem-title');
    this.authorEl = document.getElementById('poem-author');

    this.initStars();
    this.bindEvents();
    this.resize();
    this.createParticles(poems[0]);
    this.updatePoemInfo(poems[0]);
    this.loop = this.loop.bind(this);
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  private initStars(): void {
    const count = 180;
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        radius: Math.random() * 1.5 + 0.3,
        baseAlpha: Math.random() * 0.6 + 0.2,
        alpha: Math.random() * 0.6 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    const onMouseMove = (e: MouseEvent | TouchEvent) => {
      let clientX: number, clientY: number;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }
      this.mouse.x = clientX;
      this.mouse.y = clientY;
    };

    this.canvas.addEventListener('mousedown', () => {
      this.mouse.isDown = true;
    });
    this.canvas.addEventListener('mouseup', () => {
      this.mouse.isDown = false;
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.isDown = false;
    });
    this.canvas.addEventListener('mousemove', onMouseMove);

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.mouse.isDown = true;
      onMouseMove(e);
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      onMouseMove(e);
    }, { passive: false });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.mouse.isDown = false;
    }, { passive: false });

    const btnSwitch = document.getElementById('btn-switch');
    const btnReset = document.getElementById('btn-reset');
    const sliderSize = document.getElementById('slider-size') as HTMLInputElement;
    const sliderForce = document.getElementById('slider-force') as HTMLInputElement;

    btnSwitch?.addEventListener('click', () => this.switchPoem());
    btnReset?.addEventListener('click', () => this.resetLayout());

    sliderSize?.addEventListener('input', (e) => {
      this.particleSize = parseInt((e.target as HTMLInputElement).value, 10);
      this.particles.forEach(p => p.size = this.particleSize);
    });

    sliderForce?.addEventListener('input', (e) => {
      this.mouse.forceStrength = parseFloat((e.target as HTMLInputElement).value);
    });
  }

  private resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (window.innerWidth < 768) {
      this.hGap = 24;
      this.vGap = 38;
      this.fontSize = 18;
    } else {
      this.hGap = 32;
      this.vGap = 50;
      this.fontSize = 24;
    }
    this.particleSize = this.fontSize;
    const sizeSlider = document.getElementById('slider-size') as HTMLInputElement;
    if (sizeSlider) sizeSlider.value = String(this.fontSize);

    this.repositionParticles();
    this.initStars();
  }

  private repositionParticles(): void {
    if (this.particles.length === 0) return;

    const poem = poems[this.currentPoemIndex];
    const positions = this.calculatePositions(poem.text);
    this.particles.forEach((p, i) => {
      if (positions[i]) {
        p.setOrigin(positions[i].x, positions[i].y);
      }
      p.size = this.particleSize;
    });
  }

  private calculatePositions(text: string): { x: number; y: number }[] {
    const chars = text.split('');
    const rows = Math.ceil(chars.length / this.cols);

    const totalWidth = (this.cols - 1) * this.hGap;
    const totalHeight = (rows - 1) * this.vGap;
    const startX = (this.width - totalWidth) / 2;
    const startY = (this.height - totalHeight) / 2;

    const positions: { x: number; y: number }[] = [];
    chars.forEach((_, i) => {
      const col = i % this.cols;
      const row = Math.floor(i / this.cols);
      positions.push({
        x: startX + col * this.hGap,
        y: startY + row * this.vGap
      });
    });
    return positions;
  }

  private createParticles(poem: Poem): void {
    const positions = this.calculatePositions(poem.text);
    const chars = poem.text.split('');

    this.particles = chars.map((ch, i) => {
      const scatterX = (Math.random() - 0.5) * this.width * 1.2;
      const scatterY = (Math.random() - 0.5) * this.height * 1.2;
      const p = new Particle(
        this.width / 2 + scatterX,
        this.height / 2 + scatterY,
        ch,
        this.particleSize
      );
      p.animateTo(positions[i].x, positions[i].y, 2.0, 'spring');
      return p;
    });
  }

  private updatePoemInfo(poem: Poem): void {
    if (this.titleEl) this.titleEl.textContent = poem.title;
    if (this.authorEl) this.authorEl.textContent = poem.author;
  }

  private switchPoem(): void {
    let newIndex = Math.floor(Math.random() * poems.length);
    while (newIndex === this.currentPoemIndex && poems.length > 1) {
      newIndex = Math.floor(Math.random() * poems.length);
    }
    this.currentPoemIndex = newIndex;
    const poem = poems[newIndex];
    this.updatePoemInfo(poem);

    const positions = this.calculatePositions(poem.text);
    const chars = poem.text.split('');

    while (this.particles.length < chars.length) {
      const p = new Particle(
        this.width / 2 + (Math.random() - 0.5) * 400,
        this.height / 2 + (Math.random() - 0.5) * 400,
        chars[this.particles.length],
        this.particleSize
      );
      this.particles.push(p);
    }
    while (this.particles.length > chars.length) {
      this.particles.pop();
    }

    this.particles.forEach((p, i) => {
      p.char = chars[i];
      const scatterX = this.width / 2 + (Math.random() - 0.5) * this.width * 1.5;
      const scatterY = this.height / 2 + (Math.random() - 0.5) * this.height * 1.5;
      p.x = scatterX;
      p.y = scatterY;
      p.vx = 0;
      p.vy = 0;
      p.trailPositions = [];
      p.animateTo(positions[i].x, positions[i].y, 2.0, 'spring');
    });
  }

  private resetLayout(): void {
    const positions = this.calculatePositions(poems[this.currentPoemIndex].text);
    this.particles.forEach((p, i) => {
      if (positions[i]) {
        p.vx = 0;
        p.vy = 0;
        p.trailPositions = [];
        p.animateTo(positions[i].x, positions[i].y, 0.8, 'easeout');
      }
    });
  }

  private renderStars(): void {
    this.stars.forEach(star => {
      star.phase += star.twinkleSpeed;
      const variation = Math.sin(star.phase) * 0.3;
      star.alpha = Math.max(0.2, Math.min(0.8, star.baseAlpha + variation));

      this.ctx.beginPath();
      this.ctx.arc(star.x * this.width, star.y * this.height, star.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      this.ctx.fill();
    });
  }

  private renderBackground(): void {
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#0B0A26');
    grad.addColorStop(1, '#1B1340');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private loop(time: number): void {
    const dt = Math.min((time - this.lastTime) / 16.67, 2);
    this.lastTime = time;

    this.renderBackground();
    this.renderStars();

    this.particles.forEach(p => {
      p.update(this.mouse, dt);
      p.render(this.ctx);
    });

    requestAnimationFrame(this.loop);
  }
}

new App();
