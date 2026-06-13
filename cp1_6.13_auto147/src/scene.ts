import { random, degToRad, easeInOutSine } from './utils';

export interface CandleState {
  baseColor: string;
  currentColor: string;
  targetColor: string;
  colorTransitionProgress: number;
  flameHeight: number;
  flamePhase: number;
  glowRadius: number;
}

export interface Lantern {
  x: number;
  y: number;
  width: number;
  height: number;
  swingPhase: number;
  swingAmplitude: number;
}

export class SceneRenderer {
  private woodCanvas: HTMLCanvasElement;
  private woodCtx: CanvasRenderingContext2D;
  private curtainCanvas: HTMLCanvasElement;
  private curtainCtx: CanvasRenderingContext2D;
  private lanternsCanvas: HTMLCanvasElement;
  private lanternsCtx: CanvasRenderingContext2D;
  private candleCanvas: HTMLCanvasElement;
  private candleCtx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  public candle: CandleState;
  public lanterns: Lantern[];
  private time: number = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    this.woodCanvas = document.getElementById('wood-background') as HTMLCanvasElement;
    this.curtainCanvas = document.getElementById('curtain') as HTMLCanvasElement;
    this.lanternsCanvas = document.getElementById('lanterns-layer') as HTMLCanvasElement;
    this.candleCanvas = document.getElementById('candle-light') as HTMLCanvasElement;

    this.candle = {
      baseColor: '#ffdd77',
      currentColor: '#ffdd77',
      targetColor: '#ffdd77',
      colorTransitionProgress: 1,
      flameHeight: 45,
      flamePhase: 0,
      glowRadius: 300
    };

    this.resizeCanvases();

    this.woodCtx = this.woodCanvas.getContext('2d')!;
    this.curtainCtx = this.curtainCanvas.getContext('2d')!;
    this.lanternsCtx = this.lanternsCanvas.getContext('2d')!;
    this.candleCtx = this.candleCanvas.getContext('2d')!;

    this.lanterns = this.createLanterns();
    this.generateWoodTexture();
    this.generateCurtainTexture();
  }

  private resizeCanvases(): void {
    const dpr = window.devicePixelRatio || 1;

    const setupCanvas = (canvas: HTMLCanvasElement, w: number, h: number) => {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
    };

    setupCanvas(this.woodCanvas, this.width, this.height);
    setupCanvas(this.curtainCanvas, this.width, this.height);
    setupCanvas(this.lanternsCanvas, this.width, 120);
    setupCanvas(this.candleCanvas, this.candle.glowRadius * 2, this.candle.glowRadius * 2 + 60);
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.resizeCanvases();
    this.lanterns = this.createLanterns();
    this.generateWoodTexture();
    this.generateCurtainTexture();
  }

  private createLanterns(): Lantern[] {
    const lanterns: Lantern[] = [];
    const count = 5;
    const spacing = this.width / (count + 1);
    for (let i = 0; i < count; i++) {
      lanterns.push({
        x: spacing * (i + 1),
        y: 40,
        width: 30,
        height: 40,
        swingPhase: random(0, Math.PI * 2),
        swingAmplitude: degToRad(5)
      });
    }
    return lanterns;
  }

  public setCandleTargetColor(color: string, durationMs: number = 2000): void {
    this.candle.targetColor = color;
    this.candle.colorTransitionProgress = 0;
    (this.candle as any)._transitionDuration = durationMs;
  }

  private generateWoodTexture(): void {
    const ctx = this.woodCtx;
    ctx.clearRect(0, 0, this.width, this.height);

    const baseBrown = '#4a2c17';
    const darkBrown = '#2d1a0c';
    const lightBrown = '#5e3a1f';

    ctx.fillStyle = baseBrown;
    ctx.fillRect(0, 0, this.width, this.height);

    const stripeHeight = 30;
    for (let y = 0; y < this.height; y += stripeHeight) {
      const variation = random(-0.1, 0.1);
      const gradient = ctx.createLinearGradient(0, y, 0, y + stripeHeight);
      gradient.addColorStop(0, darkBrown);
      gradient.addColorStop(0.3 + variation, lightBrown);
      gradient.addColorStop(0.7 + variation, darkBrown);
      gradient.addColorStop(1, baseBrown);
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(0, y, this.width, stripeHeight);
    }

    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 80; i++) {
      const x = random(0, this.width);
      const y = random(0, this.height);
      const w = random(50, 200);
      const h = random(1, 3);
      ctx.fillStyle = random(0, 1) > 0.5 ? lightBrown : darkBrown;
      ctx.fillRect(x, y, w, h);
    }

    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 30; i++) {
      const x = random(0, this.width);
      const y = random(0, this.height);
      const radius = random(5, 20);
      ctx.beginPath();
      ctx.ellipse(x, y, radius, radius * 0.3, random(0, Math.PI), 0, Math.PI * 2);
      ctx.fillStyle = darkBrown;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  private generateCurtainTexture(): void {
    const ctx = this.curtainCtx;
    ctx.clearRect(0, 0, this.width, this.height);

    const paperColor = { r: 245, g: 228, b: 188 };

    ctx.fillStyle = `rgb(${paperColor.r}, ${paperColor.g}, ${paperColor.b})`;
    ctx.fillRect(0, 0, this.width, this.height);

    const imageData = ctx.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = random(-15, 15);
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise - 5));
      data[i + 3] = 210;
    }

    ctx.putImageData(imageData, 0, 0);

    const edgeFuzz = 30;
    ctx.save();
    for (let i = 0; i < 300; i++) {
      const edge = Math.floor(random(0, 4));
      let x: number, y: number, w: number, h: number;

      if (edge === 0) {
        x = random(0, this.width);
        y = random(0, edgeFuzz);
        w = random(2, 8);
        h = random(5, edgeFuzz - y + 5);
      } else if (edge === 1) {
        x = random(0, this.width);
        y = this.height - random(0, edgeFuzz);
        w = random(2, 8);
        h = random(5, edgeFuzz);
      } else if (edge === 2) {
        x = random(0, edgeFuzz);
        y = random(0, this.height);
        w = random(5, edgeFuzz - x + 5);
        h = random(2, 8);
      } else {
        x = this.width - random(0, edgeFuzz);
        y = random(0, this.height);
        w = random(5, edgeFuzz);
        h = random(2, 8);
      }

      ctx.fillStyle = `rgba(${paperColor.r - 20}, ${paperColor.g - 20}, ${paperColor.b - 30}, 0.7)`;
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();

    const shadowGrad = ctx.createLinearGradient(0, 0, this.width, 0);
    shadowGrad.addColorStop(0, 'rgba(45, 26, 12, 0.4)');
    shadowGrad.addColorStop(0.05, 'rgba(45, 26, 12, 0)');
    shadowGrad.addColorStop(0.95, 'rgba(45, 26, 12, 0)');
    shadowGrad.addColorStop(1, 'rgba(45, 26, 12, 0.4)');
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    const shadowGradV = ctx.createLinearGradient(0, 0, 0, this.height);
    shadowGradV.addColorStop(0, 'rgba(45, 26, 12, 0.3)');
    shadowGradV.addColorStop(0.05, 'rgba(45, 26, 12, 0)');
    shadowGradV.addColorStop(0.95, 'rgba(45, 26, 12, 0)');
    shadowGradV.addColorStop(1, 'rgba(45, 26, 12, 0.5)');
    ctx.fillStyle = shadowGradV;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  public update(dt: number): void {
    this.time += dt;
    this.candle.flamePhase += dt * (1000 / 1500) * Math.PI * 2;
    this.candle.flameHeight = 45 + Math.sin(this.candle.flamePhase) * 5;

    if (this.candle.colorTransitionProgress < 1) {
      const duration = (this.candle as any)._transitionDuration || 2000;
      this.candle.colorTransitionProgress = Math.min(
        1,
        this.candle.colorTransitionProgress + dt / duration
      );

      const t = easeInOutSine(this.candle.colorTransitionProgress);

      if (!(this.candle as any)._startColor) {
        (this.candle as any)._startColor = this.candle.currentColor;
      }

      const lerp = (a: string, b: string, tt: number) => {
        const parse = (h: string) => [
          parseInt(h.slice(1, 3), 16),
          parseInt(h.slice(3, 5), 16),
          parseInt(h.slice(5, 7), 16)
        ];
        const [ar, ag, ab] = parse(a);
        const [br, bg, bb] = parse(b);
        const toHex = (n: number) =>
          Math.round(n).toString(16).padStart(2, '0');
        return `#${toHex(ar + (br - ar) * tt)}${toHex(ag + (bg - ag) * tt)}${toHex(ab + (bb - ab) * tt)}`;
      };

      this.candle.currentColor = lerp(
        (this.candle as any)._startColor,
        this.candle.targetColor,
        t
      );

      if (this.candle.colorTransitionProgress >= 1) {
        (this.candle as any)._startColor = null;
      }
    }
  }

  public drawLanterns(): void {
    const ctx = this.lanternsCtx;
    const w = this.width;
    const h = 120;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = '#2d1a0c';
    ctx.lineWidth = 2;
    for (const lantern of this.lanterns) {
      const swingAngle = Math.sin(this.time * (1000 / 2000) * Math.PI * 2 + lantern.swingPhase) * lantern.swingAmplitude;
      const pivotX = lantern.x;
      const pivotY = 10;
      const offsetX = Math.sin(swingAngle) * (lantern.y - pivotY);
      const offsetY = (1 - Math.cos(swingAngle)) * (lantern.y - pivotY);

      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(pivotX + offsetX, pivotY + offsetY + lantern.y - pivotY - lantern.height);
      ctx.stroke();

      ctx.save();
      ctx.translate(pivotX + offsetX, pivotY + offsetY + lantern.y - pivotY);
      ctx.rotate(swingAngle);

      const glow = ctx.createRadialGradient(0, -lantern.height / 2, 0, 0, -lantern.height / 2, lantern.width * 2);
      glow.addColorStop(0, 'rgba(255, 180, 100, 0.4)');
      glow.addColorStop(1, 'rgba(255, 180, 100, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-lantern.width * 2, -lantern.height * 1.5, lantern.width * 4, lantern.height * 2);

      const bodyGrad = ctx.createLinearGradient(-lantern.width / 2, -lantern.height, lantern.width / 2, 0);
      bodyGrad.addColorStop(0, '#ff9944');
      bodyGrad.addColorStop(0.5, '#ff7722');
      bodyGrad.addColorStop(1, '#dd5511');
      ctx.fillStyle = bodyGrad;

      ctx.beginPath();
      ctx.ellipse(0, -lantern.height / 2, lantern.width / 2, lantern.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.5;
      ctx.stroke();

      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-lantern.width / 2, -lantern.height / 2);
      ctx.lineTo(lantern.width / 2, -lantern.height / 2);
      ctx.moveTo(0, -lantern.height);
      ctx.lineTo(0, 0);
      ctx.moveTo(-lantern.width / 3, -lantern.height);
      ctx.lineTo(-lantern.width / 4, 0);
      ctx.moveTo(lantern.width / 3, -lantern.height);
      ctx.lineTo(lantern.width / 4, 0);
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(-lantern.width / 2 - 2, -lantern.height - 4, lantern.width + 4, 4);
      ctx.fillRect(-lantern.width / 2 - 2, 0, lantern.width + 4, 4);

      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.lineTo(0, 14);
      ctx.stroke();
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 3, 4);
        ctx.lineTo(i * 4, 12 + Math.abs(i));
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  public drawCandleLight(): void {
    const ctx = this.candleCtx;
    const size = this.candle.glowRadius * 2;
    const h = size + 60;
    ctx.clearRect(0, 0, size, h);

    const cx = size / 2;
    const cy = size;

    const color = this.candle.currentColor;
    const parseHex = (hex: string) => [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16)
    ];
    const [r, g, b] = parseHex(color);

    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.candle.glowRadius);
    glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.9)`);
    glow.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.6)`);
    glow.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.3)`);
    glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.2)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#fff5cc';
    ctx.fillRect(cx - 6, cy, 12, 40);
    ctx.fillStyle = '#ffcc66';
    ctx.fillRect(cx - 6, cy + 30, 12, 10);

    const flameBaseY = cy - 2;
    const flicker = Math.sin(this.candle.flamePhase * 2 + Math.sin(this.candle.flamePhase * 3.7) * 0.3) * 3;
    const flameH = this.candle.flameHeight + flicker;
    const flameW = 12 + Math.sin(this.candle.flamePhase * 1.5) * 2;

    ctx.save();
    const flameGrad = ctx.createLinearGradient(cx, flameBaseY - flameH, cx, flameBaseY);
    flameGrad.addColorStop(0, '#fff8e0');
    flameGrad.addColorStop(0.3, '#ffee88');
    flameGrad.addColorStop(0.6, '#ffaa33');
    flameGrad.addColorStop(1, '#ff6622');
    ctx.fillStyle = flameGrad;

    ctx.beginPath();
    ctx.moveTo(cx, flameBaseY);
    ctx.quadraticCurveTo(cx - flameW, flameBaseY - flameH * 0.5, cx, flameBaseY - flameH);
    ctx.quadraticCurveTo(cx + flameW, flameBaseY - flameH * 0.5, cx, flameBaseY);
    ctx.fill();

    const innerFlameH = flameH * 0.6;
    const innerFlameW = flameW * 0.5;
    const innerGrad = ctx.createLinearGradient(cx, flameBaseY - innerFlameH, cx, flameBaseY);
    innerGrad.addColorStop(0, '#ffffff');
    innerGrad.addColorStop(0.5, '#ffffcc');
    innerGrad.addColorStop(1, '#ffeeaa');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.moveTo(cx, flameBaseY - 5);
    ctx.quadraticCurveTo(cx - innerFlameW, flameBaseY - innerFlameH * 0.5, cx, flameBaseY - innerFlameH);
    ctx.quadraticCurveTo(cx + innerFlameW, flameBaseY - innerFlameH * 0.5, cx, flameBaseY - 5);
    ctx.fill();

    ctx.restore();
  }

  public draw(): void {
    this.drawLanterns();
    this.drawCandleLight();
  }
}
