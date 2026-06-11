import type { BackgroundParticle, DepthSliderConfig } from './types';
import type { Organism, Jellyfish, Krill, Siphonophore } from './organisms';
import type { InteractionManager } from './interaction';

interface LayerBoundary {
  depth: number;
  label: string;
  color: string;
}

const LAYER_BOUNDARIES: LayerBoundary[] = [
  { depth: 0, label: '透光层 Epipelagic', color: '#48cae4' },
  { depth: 200, label: '中层 Mesopelagic', color: '#023e8a' },
  { depth: 700, label: '半深海层 Bathypelagic', color: '#03045e' },
];

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private bgParticles: BackgroundParticle[] = [];
  private currentDepth: number = 0;
  private sliderConfig: DepthSliderConfig;
  private interactionManager: InteractionManager | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.sliderConfig = {
      min: 0,
      max: 1000,
      step: 10,
      value: 0,
      trackWidth: 20,
      trackX: canvas.width - 60,
    };
    this.initBgParticles();
  }

  setDepth(depth: number): void {
    this.currentDepth = depth;
    this.sliderConfig.value = depth;
  }

  setInteractionManager(mgr: InteractionManager): void {
    this.interactionManager = mgr;
  }

  private initBgParticles(): void {
    this.bgParticles = [];
    for (let i = 0; i < 100; i++) {
      this.bgParticles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        brightness: Math.random() * 0.15,
        size: 1 + Math.random() * 2,
        speed: 0.3,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.sliderConfig.trackX = width - 60;
    this.initBgParticles();
  }

  drawBackground(time: number): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const colLeft = w * 0.15;
    const colRight = w * 0.85;
    const colWidth = colRight - colLeft;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    const brightness = 1 - (this.currentDepth / 1000) * 0.8;
    grad.addColorStop(0, `rgba(0, 119, 182, ${brightness})`);
    grad.addColorStop(0.3, `rgba(2, 62, 138, ${brightness * 0.8})`);
    grad.addColorStop(0.7, `rgba(3, 4, 94, ${brightness * 0.5})`);
    grad.addColorStop(1, `rgba(10, 10, 26, ${Math.max(brightness * 0.2, 0.2)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const depthAlpha = Math.max(0.2, 1 - (this.currentDepth / 1000) * 0.8);
    for (const boundary of LAYER_BOUNDARIES) {
      const yPos = (boundary.depth / 1000) * h;
      ctx.fillStyle = boundary.color;
      ctx.globalAlpha = depthAlpha * 0.5;
      ctx.fillRect(colLeft, yPos, colWidth, 1.5);
      ctx.globalAlpha = 1;

      ctx.font = '12px sans-serif';
      ctx.fillStyle = `rgba(160, 196, 255, ${0.6 * depthAlpha})`;
      ctx.textAlign = 'left';
      ctx.fillText(boundary.label, colLeft + 8, yPos - 6);
    }

    for (const p of this.bgParticles) {
      p.y += p.speed * (Math.sin(time / 2000 + p.phase) > 0 ? 1 : -1) * 0.1;
      p.y = Math.max(0, Math.min(h, p.y));
      ctx.fillStyle = `rgba(150, 200, 255, ${p.brightness * depthAlpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawDepthSlider(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const trackX = w - 50;
    const trackY = 60;
    const trackH = h - 120;
    const trackW = this.sliderConfig.trackWidth;

    this.sliderConfig.trackX = trackX;

    const trackGrad = ctx.createLinearGradient(0, trackY, 0, trackY + trackH);
    trackGrad.addColorStop(0, '#0077b6');
    trackGrad.addColorStop(0.3, '#023e8a');
    trackGrad.addColorStop(0.7, '#03045e');
    trackGrad.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = trackGrad;
    ctx.beginPath();
    ctx.roundRect(trackX - trackW / 2, trackY, trackW, trackH, 10);
    ctx.fill();

    ctx.strokeStyle = 'rgba(90, 122, 154, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(trackX - trackW / 2, trackY, trackW, trackH, 10);
    ctx.stroke();

    const ratio = this.sliderConfig.value / 1000;
    const thumbY = trackY + ratio * trackH;

    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(trackX - trackW / 2 - 3, thumbY - 8, trackW + 6, 16, 4);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.sliderConfig.value}m`, trackX, thumbY - 14);

    if (this.interactionManager) {
      this.interactionManager.setSliderRect({
        x: trackX - trackW / 2 - 10,
        y: trackY,
        width: trackW + 20,
        height: trackH,
      });
    }
  }

  drawInfoPanel(organisms: Organism[]): void {
    const ctx = this.ctx;
    const panelX = 15;
    const panelY = 15;
    const panelW = 200;
    const panelH = 280;

    ctx.fillStyle = 'rgba(10, 10, 30, 0.7)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 8);
    ctx.fill();

    ctx.strokeStyle = '#5a7a9a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 8);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`深度: ${this.currentDepth}m`, panelX + 15, panelY + 35);

    ctx.fillStyle = 'rgba(90, 122, 154, 0.5)';
    ctx.fillRect(panelX + 15, panelY + 50, panelW - 30, 1);

    let yPos = panelY + 75;
    const jellyfish = organisms.filter((o) => o.type === 'jellyfish');
    const krill = organisms.filter((o) => o.type === 'krill');
    const siphonophore = organisms.filter((o) => o.type === 'siphonophore');

    ctx.fillStyle = '#a0c4ff';
    ctx.font = '13px sans-serif';
    ctx.fillText('🪼 发光水母', panelX + 15, yPos);
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`${jellyfish.length}`, panelX + 150, yPos);
    yPos += 18;
    ctx.fillStyle = '#a0c4ff';
    ctx.font = '11px sans-serif';
    ctx.fillText(`  闪光次数: `, panelX + 15, yPos);
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`${jellyfish.reduce((s, o) => s + o.glowCount, 0)}`, panelX + 120, yPos);
    yPos += 28;

    ctx.fillStyle = '#a0c4ff';
    ctx.font = '13px sans-serif';
    ctx.fillText('🦐 磷虾', panelX + 15, yPos);
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`${krill.length}`, panelX + 150, yPos);
    yPos += 18;
    ctx.fillStyle = '#a0c4ff';
    ctx.font = '11px sans-serif';
    ctx.fillText(`  闪光次数: `, panelX + 15, yPos);
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`${krill.reduce((s, o) => s + o.glowCount, 0)}`, panelX + 120, yPos);
    yPos += 28;

    ctx.fillStyle = '#a0c4ff';
    ctx.font = '13px sans-serif';
    ctx.fillText('🔗 管水母', panelX + 15, yPos);
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`${siphonophore.length}`, panelX + 150, yPos);
    yPos += 18;
    ctx.fillStyle = '#a0c4ff';
    ctx.font = '11px sans-serif';
    ctx.fillText(`  闪光次数: `, panelX + 15, yPos);
    ctx.fillStyle = '#00e5ff';
    ctx.fillText(`${siphonophore.reduce((s, o) => s + o.glowCount, 0)}`, panelX + 120, yPos);

    const btnX = panelX + 30;
    const btnY = panelY + panelH - 50;
    const btnW = panelW - 60;
    const btnH = 32;

    ctx.fillStyle = '#005f73';
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('重置迁徙', btnX + btnW / 2, btnY + 21);
    ctx.textAlign = 'left';

    if (this.interactionManager) {
      this.interactionManager.setResetButtonRect({ x: btnX, y: btnY, width: btnW, height: btnH });
    }
  }

  drawOrganisms(organisms: Organism[], time: number): void {
    for (const org of organisms) {
      org.draw(this.ctx, time);
    }
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  getCtx(): CanvasRenderingContext2D {
    return this.ctx;
  }
}
