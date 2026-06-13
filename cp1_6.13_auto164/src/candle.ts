export interface CandleConfig {
  x: number;
  y: number;
  height: number;
  diameter: number;
}

interface FlameLayer {
  radius: number;
  color: string;
  alpha: number;
}

export class Candle {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: CandleConfig;
  private flameHeight: number = 30;
  private flameTargetHeight: number = 30;
  private flickerPhase: number = 0;
  private flickerPeriod: number = 1200;
  private baseIntensity: number = 1;
  private flashIntensity: number = 0;
  private flashStartTime: number = 0;
  private flashDuration: number = 300;
  private victoryColor: string | null = null;
  private victoryBlend: number = 0;
  private time: number = 0;

  private flameLayers: FlameLayer[] = [
    { radius: 0, color: '#ffffff', alpha: 1 },
    { radius: 0, color: '#ffdd44', alpha: 0.9 },
    { radius: 0, color: '#ff8800', alpha: 0.7 },
    { radius: 0, color: '#aa3300', alpha: 0.4 }
  ];

  constructor(canvas: HTMLCanvasElement, config: CandleConfig) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
    this.config = { ...config };
  }

  public setPosition(x: number, y: number): void {
    this.config.x = x;
    this.config.y = y;
  }

  public triggerFlash(): void {
    this.flashStartTime = performance.now();
    this.flashIntensity = 1;
  }

  public setVictoryColor(color: string | null): void {
    this.victoryColor = color;
  }

  public setVictoryBlend(value: number): void {
    this.victoryBlend = Math.max(0, Math.min(1, value));
  }

  public getGlowIntensity(): number {
    const flashBoost = this.flashIntensity * 0.2;
    return this.baseIntensity + flashBoost + this.victoryBlend * 0.5;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    this.flickerPhase += deltaTime;
    if (this.flickerPhase >= this.flickerPeriod) {
      this.flickerPhase -= this.flickerPeriod;
      this.flameTargetHeight = 25 + Math.random() * 10;
    }

    const t = this.flickerPhase / this.flickerPeriod;
    const flickerOffset = Math.sin(t * Math.PI * 4) * 2 + Math.sin(t * Math.PI * 7 + 1) * 1;
    const targetHeight = this.flameTargetHeight + flickerOffset;
    this.flameHeight += (targetHeight - this.flameHeight) * 0.15;

    this.baseIntensity = 1 + Math.sin(this.time * 0.003) * 0.05 + Math.sin(this.time * 0.007) * 0.03;

    if (this.flashIntensity > 0) {
      const elapsed = performance.now() - this.flashStartTime;
      if (elapsed < this.flashDuration) {
        const progress = elapsed / this.flashDuration;
        if (progress < 0.3) {
          this.flashIntensity = progress / 0.3;
        } else {
          this.flashIntensity = 1 - (progress - 0.3) / 0.7;
        }
      } else {
        this.flashIntensity = 0;
      }
    }

    const baseRadius = 8;
    const heightRatio = this.flameHeight / 30;
    this.flameLayers[0].radius = baseRadius * 0.25 * heightRatio;
    this.flameLayers[1].radius = baseRadius * 0.5 * heightRatio;
    this.flameLayers[2].radius = baseRadius * 0.75 * heightRatio;
    this.flameLayers[3].radius = baseRadius * 1.1 * heightRatio;
  }

  public render(): void {
    const ctx = this.ctx;
    const { x, y, height, diameter } = this.config;
    const glowIntensity = this.getGlowIntensity();

    this.drawGlow(x, y - height * 0.3, glowIntensity);
    this.drawCandleBody();
    this.drawFlame(x, y - height, glowIntensity);
    this.drawWick();
  }

  private drawCandleBody(): void {
    const ctx = this.ctx;
    const { x, y, height, diameter } = this.config;
    const radius = diameter / 2;

    ctx.save();

    const bodyGradient = ctx.createLinearGradient(x - radius, y - height, x + radius, y);
    bodyGradient.addColorStop(0, '#fffbf0');
    bodyGradient.addColorStop(0.3, '#f5efe0');
    bodyGradient.addColorStop(0.7, '#ebe5d5');
    bodyGradient.addColorStop(1, '#e0dac5');

    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.moveTo(x - radius, y - height + radius * 0.3);
    ctx.lineTo(x - radius, y - radius * 0.3);
    ctx.quadraticCurveTo(x - radius, y, x, y);
    ctx.quadraticCurveTo(x + radius, y, x + radius, y - radius * 0.3);
    ctx.lineTo(x + radius, y - height + radius * 0.3);
    ctx.quadraticCurveTo(x + radius, y - height, x, y - height);
    ctx.quadraticCurveTo(x - radius, y - height, x - radius, y - height + radius * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 251, 240, 0.8)';
    ctx.beginPath();
    ctx.ellipse(x, y - height, radius, radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(200, 190, 170, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const ringY = y - height + (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.9, ringY);
      ctx.lineTo(x + radius * 0.9, ringY);
      ctx.stroke();
    }

    const highlightGradient = ctx.createLinearGradient(x - radius, y - height, x - radius * 0.3, y);
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = highlightGradient;
    ctx.beginPath();
    ctx.moveTo(x - radius * 0.9, y - height + radius * 0.3);
    ctx.lineTo(x - radius * 0.3, y - height + radius * 0.3);
    ctx.lineTo(x - radius * 0.4, y - radius * 0.3);
    ctx.lineTo(x - radius * 0.9, y - radius * 0.3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawWick(): void {
    const ctx = this.ctx;
    const { x, y, height } = this.config;

    ctx.save();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(x, y - height);
    ctx.quadraticCurveTo(x + 1, y - height - 4, x, y - height - 8);
    ctx.stroke();

    ctx.restore();
  }

  private drawFlame(centerX: number, baseY: number, intensity: number): void {
    const ctx = this.ctx;
    const flameH = this.flameHeight * intensity;
    const wobble = Math.sin(this.time * 0.008) * 2 + Math.sin(this.time * 0.013) * 1;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const layers = [...this.flameLayers].reverse();
    
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const layerHeight = flameH * (1 - i * 0.15);
      const layerWidth = layer.radius * (1 + i * 0.1);
      
      const gradient = ctx.createRadialGradient(
        centerX + wobble * (1 - i * 0.2), baseY - layerHeight * 0.3, 0,
        centerX + wobble * (1 - i * 0.2), baseY - layerHeight * 0.3, layerWidth
      );

      let color = layer.color;
      if (this.victoryColor && this.victoryBlend > 0) {
        color = this.blendColors(layer.color, this.victoryColor, this.victoryBlend * 0.5);
      }

      gradient.addColorStop(0, this.hexToRgba(color, layer.alpha * intensity));
      gradient.addColorStop(0.5, this.hexToRgba(color, layer.alpha * 0.6 * intensity));
      gradient.addColorStop(1, this.hexToRgba(color, 0));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      
      const tipX = centerX + wobble * (1 - i * 0.15);
      const tipY = baseY - layerHeight;
      
      ctx.moveTo(centerX, baseY + layerWidth * 0.2);
      ctx.quadraticCurveTo(centerX - layerWidth, baseY - layerHeight * 0.3, tipX, tipY);
      ctx.quadraticCurveTo(centerX + layerWidth, baseY - layerHeight * 0.3, centerX, baseY + layerWidth * 0.2);
      ctx.fill();
    }

    const innerGlow = ctx.createRadialGradient(
      centerX + wobble * 0.5, baseY - flameH * 0.4, 0,
      centerX + wobble * 0.5, baseY - flameH * 0.4, 4
    );
    innerGlow.addColorStop(0, `rgba(255, 255, 255, ${0.9 * intensity})`);
    innerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.arc(centerX + wobble * 0.5, baseY - flameH * 0.4, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawGlow(x: number, y: number, intensity: number): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 150 * intensity);
    glowGradient.addColorStop(0, `rgba(255, 180, 80, ${0.3 * intensity})`);
    glowGradient.addColorStop(0.3, `rgba(255, 140, 50, ${0.15 * intensity})`);
    glowGradient.addColorStop(0.6, `rgba(255, 100, 30, ${0.05 * intensity})`);
    glowGradient.addColorStop(1, 'rgba(255, 80, 20, 0)');

    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, 150 * intensity, 0, Math.PI * 2);
    ctx.fill();

    if (this.victoryColor && this.victoryBlend > 0) {
      const victoryGlow = ctx.createRadialGradient(x, y, 0, x, y, 200 * intensity);
      victoryGlow.addColorStop(0, this.hexToRgba(this.victoryColor, 0.2 * this.victoryBlend * intensity));
      victoryGlow.addColorStop(1, this.hexToRgba(this.victoryColor, 0));
      
      ctx.fillStyle = victoryGlow;
      ctx.beginPath();
      ctx.arc(x, y, 200 * intensity, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private blendColors(color1: string, color2: string, ratio: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
    const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
    const b = Math.round(b1 * (1 - ratio) + b2 * ratio);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}
