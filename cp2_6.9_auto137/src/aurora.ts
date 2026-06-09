interface AuroraLayerConfig {
  vertexCount: number;
  colorStart: string;
  colorEnd: string;
  alpha: number;
  driftSpeed: number;
  amplitude: number;
  frequency: number;
  baseY: number;
}

interface AuroraLayer {
  config: AuroraLayerConfig;
  phase: number;
  driftOffset: number;
  cachedGradient: CanvasGradient | null;
  currentAlpha: number;
  targetAlpha: number;
  alphaTransitionStart: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function shiftHue(hex: string, degrees: number): string {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  hsl.h = (hsl.h + degrees + 360) % 360;
  const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return `rgb(${newRgb.r}, ${newRgb.g}, ${newRgb.b})`;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export class Aurora {
  private layers: AuroraLayer[] = [];
  private width: number;
  private height: number;
  private shockwaveBoost: number = 0;
  private shockwaveTime: number = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.initLayers();
  }

  private initLayers(): void {
    const configs: AuroraLayerConfig[] = [
      {
        vertexCount: 150,
        colorStart: '#00ff88',
        colorEnd: '#00ccff',
        alpha: 0.25,
        driftSpeed: 0.3,
        amplitude: 80,
        frequency: 0.02,
        baseY: 0.55
      },
      {
        vertexCount: 150,
        colorStart: '#ff66ff',
        colorEnd: '#ff00aa',
        alpha: 0.15,
        driftSpeed: 0.6,
        amplitude: 60,
        frequency: 0.03,
        baseY: 0.45
      },
      {
        vertexCount: 150,
        colorStart: '#ffff00',
        colorEnd: '#ff8800',
        alpha: 0.08,
        driftSpeed: 0.9,
        amplitude: 40,
        frequency: 0.04,
        baseY: 0.35
      }
    ];

    this.layers = configs.map((config) => ({
      config,
      phase: Math.random() * Math.PI * 2,
      driftOffset: 0,
      cachedGradient: null,
      currentAlpha: config.alpha,
      targetAlpha: config.alpha,
      alphaTransitionStart: 0
    }));
  }

  public update(auroraSpeed: number, colorShift: number, smooth: boolean): void {
    const now = performance.now();

    for (const layer of this.layers) {
      layer.phase += layer.config.frequency * auroraSpeed;
      layer.driftOffset += layer.config.driftSpeed * auroraSpeed;
      if (layer.driftOffset > this.width * 2) {
        layer.driftOffset -= this.width * 2;
      }

      const elapsed = (now - layer.alphaTransitionStart) / 300;
      if (elapsed < 1) {
        const t = easeOutCubic(elapsed);
        layer.currentAlpha = layer.config.alpha + (this.shockwaveBoost * (1 - t));
      } else {
        layer.currentAlpha = layer.config.alpha;
      }
    }

    this.shockwaveBoost = 0;
    void smooth;
    void colorShift;
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number, mouseHueShift: number = 0): void {
    this.width = width;
    this.height = height;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = this.layers.length - 1; i >= 0; i--) {
      this.renderLayer(ctx, this.layers[i], mouseHueShift);
    }

    ctx.restore();
  }

  private renderLayer(ctx: CanvasRenderingContext2D, layer: AuroraLayer, mouseHueShift: number): void {
    const { config, phase, driftOffset, currentAlpha } = layer;
    const { vertexCount, amplitude, baseY } = config;

    const shiftedStart = shiftHue(config.colorStart, mouseHueShift);
    const shiftedEnd = shiftHue(config.colorEnd, mouseHueShift);

    const gradient = ctx.createLinearGradient(0, 0, this.width, 0);
    gradient.addColorStop(0, shiftedStart);
    gradient.addColorStop(1, shiftedEnd);

    const baseYpx = this.height * baseY;
    const stepX = this.width / (vertexCount - 1);

    const points: { x: number; y: number }[] = [];

    for (let i = 0; i < vertexCount; i++) {
      const x = i * stepX;
      const wave1 = Math.sin(phase + i * 0.08 + driftOffset * 0.005) * amplitude;
      const wave2 = Math.sin(phase * 1.5 + i * 0.12 + driftOffset * 0.008) * (amplitude * 0.4);
      const y = baseYpx + wave1 + wave2;
      points.push({ x, y });
    }

    const baseBottomY = this.height + 20;

    ctx.save();
    ctx.globalAlpha = currentAlpha;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(points[0].x, baseBottomY);
    ctx.lineTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      const cpy = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
    }

    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(points[points.length - 1].x, baseBottomY);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = currentAlpha * 0.6;
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      const cpy = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();

    ctx.restore();
  }

  public triggerShockwave(): void {
    this.shockwaveBoost = 0.5;
    this.shockwaveTime = performance.now();
    for (const layer of this.layers) {
      layer.alphaTransitionStart = performance.now();
    }
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    for (const layer of this.layers) {
      layer.cachedGradient = null;
    }
  }
}
