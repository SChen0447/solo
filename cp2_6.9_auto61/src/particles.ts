export interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  alpha: number;
  baseAlpha: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private centerX: number = 0;
  private centerY: number = 0;
  private radius: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private attractionRadius: number = 80;
  private isMobile: boolean;

  constructor(canvas: HTMLCanvasElement, isMobile: boolean) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.isMobile = isMobile;
    this.resize();
    this.initParticles();
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.centerX = rect.width / 2;
    this.centerY = rect.height / 2;
    this.radius = Math.min(rect.width, rect.height) / 2;

    if (this.isMobile) {
      this.attractionRadius = 60;
    }
  }

  private initParticles(): void {
    const count = this.isMobile ? 100 : 220;
    this.particles = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * this.radius * 0.92;
      const x = this.centerX + Math.cos(angle) * dist;
      const y = this.centerY + Math.sin(angle) * dist;
      const size = 2 + Math.random() * 2;
      const alpha = 0.1 + Math.random() * 0.5;

      this.particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size,
        baseSize: size,
        alpha,
        baseAlpha: alpha,
      });
    }
  }

  public updateMousePosition(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = clientX - rect.left;
    this.mouseY = clientY - rect.top;
  }

  private isInsideCircle(x: number, y: number): boolean {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    return dx * dx + dy * dy <= this.radius * this.radius * 0.96;
  }

  public update(): void {
    for (const p of this.particles) {
      const brownianSpeed = 0.3 + Math.random() * 0.5;
      p.vx += (Math.random() - 0.5) * brownianSpeed * 0.1;
      p.vy += (Math.random() - 0.5) * brownianSpeed * 0.1;

      p.vx *= 0.92;
      p.vy *= 0.92;

      const dx = this.mouseX - p.x;
      const dy = this.mouseY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.attractionRadius && dist > 0) {
        const force = Math.pow(1 - dist / this.attractionRadius, 2) * 2.5;
        p.vx += (dx / dist) * force * 0.15;
        p.vy += (dy / dist) * force * 0.15;

        const normalizedDist = dist / this.attractionRadius;
        p.alpha = 0.25 + (1 - normalizedDist * normalizedDist) * 0.45;
        p.size = p.baseSize * (1 + (1 - normalizedDist) * 1.2);
      } else {
        p.alpha += (p.baseAlpha - p.alpha) * 0.05;
        p.size += (p.baseSize - p.size) * 0.05;
      }

      p.x += p.vx;
      p.y += p.vy;

      const pdx = p.x - this.centerX;
      const pdy = p.y - this.centerY;
      const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
      const maxDist = this.radius * 0.92;

      if (pdist > maxDist) {
        const nx = pdx / pdist;
        const ny = pdy / pdist;
        p.x = this.centerX + nx * maxDist;
        p.y = this.centerY + ny * maxDist;
        p.vx *= -0.5;
        p.vy *= -0.5;
      }

      if (!this.isInsideCircle(p.x, p.y)) {
        p.x = p.baseX;
        p.y = p.baseY;
        p.vx = (Math.random() - 0.5) * 0.5;
        p.vy = (Math.random() - 0.5) * 0.5;
      }
    }
  }

  public render(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, this.radius * 0.96, 0, Math.PI * 2);
    this.ctx.clip();

    for (const p of this.particles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 215, 0, ${p.alpha})`;
      this.ctx.fill();

      const glowRadius = p.size * 2.5;
      const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
      gradient.addColorStop(0, `rgba(255, 215, 0, ${p.alpha * 0.4})`);
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  public reinitializeForMobile(isMobile: boolean): void {
    if (this.isMobile !== isMobile) {
      this.isMobile = isMobile;
      this.resize();
      this.initParticles();
    }
  }
}
