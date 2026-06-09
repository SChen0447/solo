import { Particle, FluidType, FLUID_PROPERTIES } from './types';

export class FluidRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private trailCanvas: HTMLCanvasElement;
  private trailCtx: CanvasRenderingContext2D;
  private width: number = 800;
  private height: number = 600;
  private time: number = 0;
  private fps: number = 60;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private hoveredParticle: Particle | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    this.trailCanvas = document.createElement('canvas');
    this.trailCtx = this.trailCanvas.getContext('2d')!;
  }

  public setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    this.trailCanvas.width = width;
    this.trailCanvas.height = height;
  }

  public setHoveredParticle(particle: Particle | null): void {
    this.hoveredParticle = particle;
  }

  public setMousePosition(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  public getFPS(): number {
    return this.fps;
  }

  public render(particles: Particle[], dt: number): void {
    this.time += dt;
    this.frameCount++;
    
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.drawTrails(particles);
    
    this.trailCtx.fillStyle = 'rgba(10, 10, 15, 0.1)';
    this.trailCtx.fillRect(0, 0, this.width, this.height);

    for (const p of particles) {
      this.drawParticle(p);
    }

    this.drawParticleInfo();
  }

  private drawTrails(particles: Particle[]): void {
    for (const p of particles) {
      if (p.trail.length < 2) continue;

      const props = FLUID_PROPERTIES[p.type];
      
      for (let i = 1; i < p.trail.length; i++) {
        const t1 = p.trail[i - 1];
        const t2 = p.trail[i];
        
        const alpha = (t1.alpha + t2.alpha) / 2 * 0.4;
        
        this.trailCtx.beginPath();
        this.trailCtx.moveTo(t1.x, t1.y);
        this.trailCtx.lineTo(t2.x, t2.y);
        this.trailCtx.strokeStyle = this.getColorWithAlpha(props.color, alpha);
        this.trailCtx.lineWidth = p.radius * 0.8;
        this.trailCtx.lineCap = 'round';
        this.trailCtx.stroke();
      }
    }

    this.ctx.drawImage(this.trailCanvas, 0, 0);
  }

  private drawParticle(p: Particle): void {
    const props = FLUID_PROPERTIES[p.type];
    
    let alpha = 1;
    if (p.life > 0 && p.maxLife > 0) {
      alpha = Math.min(1, p.life / p.maxLife * 2);
    }

    const gradient = this.ctx.createRadialGradient(
      p.x, p.y, 0,
      p.x, p.y, p.radius * 2.5
    );

    const tempColor = this.getTemperatureColor(p.type, p.temperature);
    gradient.addColorStop(0, this.getColorWithAlpha(tempColor, alpha));
    gradient.addColorStop(0.4, this.getColorWithAlpha(props.color, alpha * 0.8));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    if (p.type === FluidType.MAGMA) {
      this.drawMagmaRipple(p, alpha);
    } else if (p.type === FluidType.WATER) {
      this.drawWaterHighlight(p, alpha);
    } else if (p.type === FluidType.OIL) {
      this.drawOilShine(p, alpha);
    }

    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = this.getColorWithAlpha(tempColor, alpha);
    this.ctx.fill();
  }

  private drawMagmaRipple(p: Particle, alpha: number): void {
    const rippleCount = 2;
    const baseRadius = p.radius * 1.5;
    
    for (let i = 0; i < rippleCount; i++) {
      const phase = (this.time * 2 + i * Math.PI) % (Math.PI * 2);
      const r = baseRadius + Math.sin(phase) * 2;
      
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 200, 100, ${alpha * 0.3 * (1 - r / (p.radius * 2.5))})`;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
  }

  private drawWaterHighlight(p: Particle, alpha: number): void {
    const highlightX = p.x - p.radius * 0.3;
    const highlightY = p.y - p.radius * 0.3;
    const highlightR = p.radius * 0.4;

    const gradient = this.ctx.createRadialGradient(
      highlightX, highlightY, 0,
      highlightX, highlightY, highlightR
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.6})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.beginPath();
    this.ctx.arc(highlightX, highlightY, highlightR, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
  }

  private drawOilShine(p: Particle, alpha: number): void {
    const shineGradient = this.ctx.createLinearGradient(
      p.x - p.radius, p.y - p.radius,
      p.x + p.radius, p.y + p.radius
    );
    shineGradient.addColorStop(0, `rgba(255, 255, 200, ${alpha * 0.3})`);
    shineGradient.addColorStop(0.5, `rgba(255, 220, 100, ${alpha * 0.1})`);
    shineGradient.addColorStop(1, `rgba(200, 150, 50, ${alpha * 0.3})`);

    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, p.radius * 0.8, 0, Math.PI * 2);
    this.ctx.fillStyle = shineGradient;
    this.ctx.fill();
  }

  private getTemperatureColor(type: FluidType, temperature: number): string {
    const props = FLUID_PROPERTIES[type];
    
    if (type === FluidType.MAGMA) {
      const t = Math.min(1, (temperature - 500) / 500);
      const r = Math.floor(255);
      const g = Math.floor(87 + t * 150);
      const b = Math.floor(34 + t * 100);
      return `rgb(${r}, ${g}, ${b})`;
    }
    
    if (type === FluidType.WATER) {
      const t = Math.min(1, (temperature - 20) / 80);
      const r = Math.floor(79 + t * 50);
      const g = Math.floor(195 - t * 30);
      const b = Math.floor(247 - t * 50);
      return `rgb(${r}, ${g}, ${b})`;
    }
    
    if (type === FluidType.OIL && temperature > 100) {
      const t = Math.min(1, (temperature - 100) / 200);
      const r = Math.floor(255);
      const g = Math.floor(213 - t * 50);
      const b = Math.floor(79 - t * 50);
      return `rgb(${r}, ${g}, ${b})`;
    }

    return props.color;
  }

  private getColorWithAlpha(color: string, alpha: number): string {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (color.startsWith('rgb(')) {
      const nums = color.slice(4, -1).split(',').map(n => parseInt(n.trim()));
      return `rgba(${nums[0]}, ${nums[1]}, ${nums[2]}, ${alpha})`;
    }
    if (color.startsWith('rgba(')) {
      const nums = color.slice(5, -1).split(',').map(n => parseFloat(n.trim()));
      return `rgba(${nums[0]}, ${nums[1]}, ${nums[2]}, ${nums[3] * alpha})`;
    }
    return color;
  }

  private drawParticleInfo(): void {
    if (!this.hoveredParticle) return;

    const p = this.hoveredParticle;
    const typeNames: Record<FluidType, string> = {
      [FluidType.WATER]: '水',
      [FluidType.OIL]: '油',
      [FluidType.MAGMA]: '岩浆',
      [FluidType.STEAM]: '蒸汽',
      [FluidType.FIRE]: '火焰'
    };

    const x = this.mouseX + 15;
    const y = this.mouseY - 10;
    const padding = 8;
    const fontSize = 12;
    const lineHeight = 18;

    const lines = [
      `类型: ${typeNames[p.type]}`,
      `温度: ${Math.round(p.temperature)}°C`
    ];

    const maxWidth = Math.max(...lines.map(l => l.length * fontSize * 0.7)) + padding * 2;
    const height = lines.length * lineHeight + padding * 2;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.beginPath();
    this.ctx.roundRect(x, y - height + padding, maxWidth, height, 4);
    this.ctx.fill();

    this.ctx.strokeStyle = '#00d4ff';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    lines.forEach((line, i) => {
      this.ctx.fillText(line, x + padding, y - height + padding + i * lineHeight + 2);
    });
  }
}
