import type { ParticleState } from './particle';

export interface RenderState {
  potAngle: number;
  potShakeOffset: number;
  liquidHeight: number;
  liquidMaxHeight: number;
  isPouring: boolean;
  glowRadius: number;
  glowOpacity: number;
  time: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 800;
  private height: number = 600;
  private dpr: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  render(particleState: ParticleState, state: RenderState): void {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground();
    this.drawAromaParticles(particleState.aromaParticles);

    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const cupCenterX = centerX + 80;
    const cupTopY = centerY - 20;
    const cupBottomY = centerY + 80;
    const cupRadius = 50;

    const potBaseX = centerX - 100 + state.potShakeOffset;
    const potBaseY = centerY - 80;

    this.drawCup(cupCenterX, cupTopY, cupBottomY, cupRadius, state.liquidHeight, state.liquidMaxHeight, state.time);
    this.drawPot(potBaseX, potBaseY, state.potAngle);
    this.drawParticles(particleState.particles);

    if (state.glowRadius > 0 && state.glowOpacity > 0) {
      this.drawGlow(cupCenterX, cupBottomY - state.liquidHeight, state.glowRadius, state.glowOpacity);
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#3E2723');
    gradient.addColorStop(1, '#1B0000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawAromaParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    for (const p of particles) {
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      gradient.addColorStop(0, `rgba(255, 213, 79, ${p.opacity})`);
      gradient.addColorStop(1, 'rgba(255, 213, 79, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPot(x: number, y: number, angle: number): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle * Math.PI / 180);

    const bodyGradient = ctx.createLinearGradient(-40, -50, 40, 50);
    bodyGradient.addColorStop(0, '#CD853F');
    bodyGradient.addColorStop(0.3, '#B87333');
    bodyGradient.addColorStop(0.6, '#8B4513');
    bodyGradient.addColorStop(1, '#5D3A1A');

    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.moveTo(-35, -40);
    ctx.bezierCurveTo(-55, -20, -60, 30, -40, 50);
    ctx.lineTo(40, 50);
    ctx.bezierCurveTo(60, 30, 55, -20, 35, -40);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const highlightGradient = ctx.createLinearGradient(-20, -45, -10, 45);
    highlightGradient.addColorStop(0, 'rgba(255, 200, 100, 0.6)');
    highlightGradient.addColorStop(0.5, 'rgba(255, 220, 150, 0.3)');
    highlightGradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.moveTo(-25, -38);
    ctx.bezierCurveTo(-35, -20, -38, 20, -25, 45);
    ctx.lineTo(-15, 45);
    ctx.bezierCurveTo(-28, 20, -25, -20, -18, -38);
    ctx.closePath();
    ctx.fill();

    const lidGradient = ctx.createLinearGradient(0, -55, 0, -40);
    lidGradient.addColorStop(0, '#DAA520');
    lidGradient.addColorStop(1, '#8B4513');
    ctx.fillStyle = lidGradient;
    ctx.beginPath();
    ctx.ellipse(0, -42, 28, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#B8860B';
    ctx.beginPath();
    ctx.ellipse(0, -52, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(50, -5, 18, -Math.PI / 2 - 0.3, Math.PI / 2 + 0.3);
    ctx.stroke();

    ctx.strokeStyle = '#CD853F';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(50, -5, 18, -Math.PI / 2 - 0.3, Math.PI / 2 + 0.3);
    ctx.stroke();

    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.moveTo(-30, -35);
    ctx.lineTo(-55, -15);
    ctx.lineTo(-65, -5);
    ctx.lineTo(-60, 5);
    ctx.lineTo(-50, 8);
    ctx.lineTo(-35, -25);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const spoutHighlight = ctx.createLinearGradient(-55, -10, -65, 5);
    spoutHighlight.addColorStop(0, 'rgba(255, 200, 100, 0.4)');
    spoutHighlight.addColorStop(1, 'rgba(255, 200, 100, 0)');
    ctx.fillStyle = spoutHighlight;
    ctx.beginPath();
    ctx.moveTo(-32, -32);
    ctx.lineTo(-55, -12);
    ctx.lineTo(-50, -8);
    ctx.lineTo(-35, -25);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawCup(
    cx: number,
    topY: number,
    bottomY: number,
    radius: number,
    liquidHeight: number,
    _maxHeight: number,
    time: number
  ): void {
    const ctx = this.ctx;
    const cupHeight = bottomY - topY;
    const bottomRadius = radius * 0.8;

    const cupGradient = ctx.createLinearGradient(cx - radius, topY, cx + radius, bottomY);
    cupGradient.addColorStop(0, '#F5E6D3');
    cupGradient.addColorStop(0.3, '#E8D5B7');
    cupGradient.addColorStop(0.7, '#D4C4A8');
    cupGradient.addColorStop(1, '#BFA88A');

    ctx.fillStyle = cupGradient;
    ctx.beginPath();
    ctx.moveTo(cx - radius, topY);
    ctx.bezierCurveTo(cx - radius - 3, topY + cupHeight * 0.3, cx - bottomRadius - 2, bottomY - 5, cx - bottomRadius, bottomY);
    ctx.lineTo(cx + bottomRadius, bottomY);
    ctx.bezierCurveTo(cx + bottomRadius + 2, bottomY - 5, cx + radius + 3, topY + cupHeight * 0.3, cx + radius, topY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const innerShadow = ctx.createRadialGradient(cx, topY + 10, 5, cx, topY + 10, radius * 0.9);
    innerShadow.addColorStop(0, 'rgba(139, 90, 43, 0.3)');
    innerShadow.addColorStop(1, 'rgba(139, 90, 43, 0)');
    ctx.fillStyle = innerShadow;
    ctx.beginPath();
    ctx.ellipse(cx, topY + 3, radius * 0.9, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const rimGradient = ctx.createLinearGradient(cx - radius, topY - 3, cx - radius, topY + 3);
    rimGradient.addColorStop(0, '#F5E6D3');
    rimGradient.addColorStop(0.5, '#FFF8E7');
    rimGradient.addColorStop(1, '#D4C4A8');
    ctx.fillStyle = rimGradient;
    ctx.beginPath();
    ctx.ellipse(cx, topY, radius, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (liquidHeight > 0) {
      this.drawLiquid(cx, topY, bottomY, radius, liquidHeight, time);
    }

    ctx.fillStyle = 'rgba(139, 115, 85, 0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, bottomY + 2, bottomRadius * 0.9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const handleGradient = ctx.createLinearGradient(cx + radius, topY + 15, cx + radius + 18, topY + 30);
    handleGradient.addColorStop(0, '#E8D5B7');
    handleGradient.addColorStop(1, '#BFA88A');
    ctx.strokeStyle = handleGradient;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx + radius + 8, topY + 25, 15, -Math.PI / 2 - 0.2, Math.PI / 2 + 0.2);
    ctx.stroke();

    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx + radius + 8, topY + 25, 15, -Math.PI / 2 - 0.2, Math.PI / 2 + 0.2);
    ctx.stroke();
  }

  private drawLiquid(
    cx: number,
    topY: number,
    bottomY: number,
    radius: number,
    liquidHeight: number,
    time: number
  ): void {
    const ctx = this.ctx;
    const liquidY = bottomY - liquidHeight;
    const bottomRadius = radius * 0.8;
    const cupHeight = bottomY - topY;

    if (liquidY >= bottomY - 2) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - radius + 5, topY + 5);
    ctx.bezierCurveTo(cx - radius + 2, topY + cupHeight * 0.3, cx - bottomRadius + 1, bottomY - 3, cx - bottomRadius, bottomY - 1);
    ctx.lineTo(cx + bottomRadius, bottomY - 1);
    ctx.bezierCurveTo(cx + bottomRadius - 1, bottomY - 3, cx + radius - 2, topY + cupHeight * 0.3, cx + radius - 5, topY + 5);
    ctx.closePath();
    ctx.clip();

    const liquidGradient = ctx.createLinearGradient(cx, liquidY - 10, cx, bottomY);
    liquidGradient.addColorStop(0, '#6F4E37');
    liquidGradient.addColorStop(0.5, '#4A2C1A');
    liquidGradient.addColorStop(1, '#2E1A0F');

    ctx.fillStyle = liquidGradient;
    ctx.beginPath();
    ctx.moveTo(cx - radius - 5, liquidY);

    const waveAmplitude = 2;
    const waveFrequency = 0.5;
    const segments = 20;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = cx - radius + t * radius * 2;
      const wave = Math.sin(t * Math.PI * 3 + time * waveFrequency) * waveAmplitude * Math.sin(t * Math.PI);
      ctx.lineTo(x, liquidY + wave);
    }

    ctx.lineTo(cx + radius + 5, bottomY + 10);
    ctx.lineTo(cx - radius - 5, bottomY + 10);
    ctx.closePath();
    ctx.fill();

    const surfaceShine = ctx.createRadialGradient(cx - 8, liquidY - 2, 1, cx - 8, liquidY - 2, 20);
    surfaceShine.addColorStop(0, 'rgba(180, 140, 100, 0.5)');
    surfaceShine.addColorStop(1, 'rgba(180, 140, 100, 0)');
    ctx.fillStyle = surfaceShine;
    ctx.beginPath();
    ctx.ellipse(cx - 8, liquidY, 20, 5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;

    for (const p of particles) {
      if (p.type === 'ripple') {
        ctx.strokeStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size, p.size * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'steam') {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${p.opacity})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const gradient = ctx.createRadialGradient(
          p.x - p.size * 0.3,
          p.y - p.size * 0.3,
          0,
          p.x,
          p.y,
          p.size
        );
        gradient.addColorStop(0, `rgba(${Math.min(255, p.color.r + 50)}, ${Math.min(255, p.color.g + 30)}, ${p.color.b}, ${p.opacity})`);
        gradient.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity * 0.7})`);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private drawGlow(cx: number, cy: number, radius: number, opacity: number): void {
    const ctx = this.ctx;

    for (let i = 3; i >= 0; i--) {
      const r = radius * (0.6 + i * 0.15);
      const o = opacity * (0.3 + i * 0.2);
      const gradient = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
      gradient.addColorStop(0, `rgba(255, 215, 100, ${o})`);
      gradient.addColorStop(0.5, `rgba(255, 193, 7, ${o * 0.5})`);
      gradient.addColorStop(1, 'rgba(255, 193, 7, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

interface Particle {
  x: number;
  y: number;
  size: number;
  color: { r: number; g: number; b: number };
  opacity: number;
  rotation: number;
  type: string;
}
