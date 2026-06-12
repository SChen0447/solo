interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  color: string;
  alpha: number;
}

export class ParticleBackground {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationId: number = 0;
  private particleCount: number = 200;
  private running: boolean = false;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '1';
    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not supported');
    this.ctx = ctx;

    this.resize();
    this.initParticles();
  }

  private resize(): void {
    this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio;
    this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  private initParticles(): void {
    this.particles = [];
    const width = this.canvas.offsetWidth;
    const height = this.canvas.offsetHeight;

    for (let i = 0; i < this.particleCount; i++) {
      const colorHue = Math.random() > 0.5 ? 180 + Math.random() * 40 : 270 + Math.random() * 40;
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 2 + Math.random() * 4,
        speedY: (Math.random() - 0.5) * 0.5,
        color: `hsl(${colorHue}, 100%, 70%)`,
        alpha: 0.3 + Math.random() * 0.7
      });
    }
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.animate();
  }

  public stop(): void {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private animate = (): void => {
    if (!this.running) return;

    this.update();
    this.render();
    this.animationId = requestAnimationFrame(this.animate);
  };

  private update(): void {
    const height = this.canvas.offsetHeight;

    for (const p of this.particles) {
      p.y += p.speedY;

      if (p.y < -10) {
        p.y = height + 10;
        p.x = Math.random() * this.canvas.offsetWidth;
      } else if (p.y > height + 10) {
        p.y = -10;
        p.x = Math.random() * this.canvas.offsetWidth;
      }
    }
  }

  private render(): void {
    const width = this.canvas.offsetWidth;
    const height = this.canvas.offsetHeight;

    this.ctx.clearRect(0, 0, width, height);

    for (const p of this.particles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
      gradient.addColorStop(0, p.color);
      gradient.addColorStop(1, 'transparent');
      this.ctx.fillStyle = gradient;
      this.ctx.globalAlpha = p.alpha * 0.3;
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1;
  }

  public handleResize(): void {
    this.resize();
    this.initParticles();
  }

  public destroy(): void {
    this.stop();
    this.canvas.remove();
  }
}
