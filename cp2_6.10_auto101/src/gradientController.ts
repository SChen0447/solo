export type GradientType = 'linear' | 'radial' | 'conic';

export interface ColorStop {
  id: string;
  color: string;
  alpha: number;
  position: number;
}

export interface LinearParams {
  angle: number;
}

export interface RadialParams {
  radius: number;
  centerX: number;
  centerY: number;
}

export interface ConicParams {
  startAngle: number;
  centerX: number;
  centerY: number;
}

export interface GradientConfig {
  type: GradientType;
  colorStops: ColorStop[];
  linear: LinearParams;
  radial: RadialParams;
  conic: ConicParams;
}

export interface RenderData {
  canvasGradient: CanvasGradient | null;
  cssCode: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;

  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatColorForCss(stop: ColorStop): string {
  if (stop.alpha >= 1) {
    return `${stop.color} ${stop.position}%`;
  }
  return `${hexToRgba(stop.color, stop.alpha)} ${stop.position}%`;
}

function sortColorStops(stops: ColorStop[]): ColorStop[] {
  return [...stops].sort((a, b) => a.position - b.position);
}

function generateLinearCss(config: GradientConfig): string {
  const sortedStops = sortColorStops(config.colorStops);
  const stopsStr = sortedStops.map(formatColorForCss).join(', ');
  return `background: linear-gradient(${config.linear.angle}deg, ${stopsStr});`;
}

function generateRadialCss(config: GradientConfig): string {
  const sortedStops = sortColorStops(config.colorStops);
  const stopsStr = sortedStops.map(formatColorForCss).join(', ');
  return `background: radial-gradient(circle ${config.radial.radius}% at ${config.radial.centerX}% ${config.radial.centerY}%, ${stopsStr});`;
}

function generateConicCss(config: GradientConfig): string {
  const sortedStops = sortColorStops(config.colorStops);
  const stopsStr = sortedStops.map(formatColorForCss).join(', ');
  return `background: conic-gradient(from ${config.conic.startAngle}deg at ${config.conic.centerX}% ${config.conic.centerY}%, ${stopsStr});`;
}

function createLinearCanvasGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: GradientConfig
): CanvasGradient {
  const angleRad = (config.linear.angle - 90) * (Math.PI / 180);
  const diagonal = Math.sqrt(width * width + height * height);
  const halfDiag = diagonal / 2;
  const centerX = width / 2;
  const centerY = height / 2;

  const x1 = centerX - Math.cos(angleRad) * halfDiag;
  const y1 = centerY - Math.sin(angleRad) * halfDiag;
  const x2 = centerX + Math.cos(angleRad) * halfDiag;
  const y2 = centerY + Math.sin(angleRad) * halfDiag;

  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  const sortedStops = sortColorStops(config.colorStops);
  sortedStops.forEach(stop => {
    gradient.addColorStop(stop.position / 100, hexToRgba(stop.color, stop.alpha));
  });

  return gradient;
}

function createRadialCanvasGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: GradientConfig
): CanvasGradient {
  const cx = (config.radial.centerX / 100) * width;
  const cy = (config.radial.centerY / 100) * height;
  const maxDimension = Math.max(width, height);
  const radius = (config.radial.radius / 100) * maxDimension;

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  const sortedStops = sortColorStops(config.colorStops);
  sortedStops.forEach(stop => {
    gradient.addColorStop(stop.position / 100, hexToRgba(stop.color, stop.alpha));
  });

  return gradient;
}

function createConicCanvasGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: GradientConfig
): CanvasGradient {
  const cx = (config.conic.centerX / 100) * width;
  const cy = (config.conic.centerY / 100) * height;
  const startAngleRad = (config.conic.startAngle * Math.PI) / 180;

  const sortedStops = sortColorStops(config.colorStops);

  if (sortedStops.length < 2) {
    return ctx.createLinearGradient(0, 0, width, height);
  }

  const numSegments = 360;
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  const stops = sortedStops.map(stop => ({
    position: stop.position / 100,
    ...hexToRgbObj(stop.color, stop.alpha)
  }));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      let angle = Math.atan2(dy, dx) - startAngleRad;
      if (angle < 0) angle += 2 * Math.PI;
      const normalizedAngle = angle / (2 * Math.PI);

      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.sqrt(cx * cx + cy * cy) + Math.max(width, height);

      let r = 0, g = 0, b = 0, a = 0;

      for (let i = 0; i < stops.length - 1; i++) {
        if (normalizedAngle >= stops[i].position && normalizedAngle <= stops[i + 1].position) {
          const range = stops[i + 1].position - stops[i].position;
          const t = range === 0 ? 0 : (normalizedAngle - stops[i].position) / range;
          r = lerp(stops[i].r, stops[i + 1].r, t);
          g = lerp(stops[i].g, stops[i + 1].g, t);
          b = lerp(stops[i].b, stops[i + 1].b, t);
          a = lerp(stops[i].a, stops[i + 1].a, t);
          break;
        }
      }

      if (normalizedAngle >= stops[stops.length - 1].position) {
        r = stops[stops.length - 1].r;
        g = stops[stops.length - 1].g;
        b = stops[stops.length - 1].b;
        a = stops[stops.length - 1].a;
      }

      const idx = (y * width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = Math.round(a * 255);
    }
  }

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(imageData, 0, 0);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  (gradient as any)._conicPattern = tempCanvas;
  return gradient;
}

function hexToRgbObj(hex: string, alpha: number): { r: number; g: number; b: number; a: number } {
  const cleanHex = hex.replace('#', '');
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;

  return {
    r: parseInt(fullHex.substring(0, 2), 16),
    g: parseInt(fullHex.substring(2, 4), 16),
    b: parseInt(fullHex.substring(4, 6), 16),
    a: alpha
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class GradientController {
  private config: GradientConfig;
  private listeners: Set<(data: RenderData) => void> = new Set();

  constructor() {
    this.config = {
      type: 'linear',
      colorStops: [
        { id: 'stop-1', color: '#ff7e5f', alpha: 1, position: 0 },
        { id: 'stop-2', color: '#feb47b', alpha: 1, position: 100 }
      ],
      linear: { angle: 90 },
      radial: { radius: 50, centerX: 50, centerY: 50 },
      conic: { startAngle: 0, centerX: 50, centerY: 50 }
    };
  }

  getConfig(): GradientConfig {
    return { ...this.config };
  }

  setType(type: GradientType): void {
    this.config.type = type;
    this.notifyListeners();
  }

  setLinearParams(params: Partial<LinearParams>): void {
    this.config.linear = { ...this.config.linear, ...params };
    this.notifyListeners();
  }

  setRadialParams(params: Partial<RadialParams>): void {
    this.config.radial = { ...this.config.radial, ...params };
    this.notifyListeners();
  }

  setConicParams(params: Partial<ConicParams>): void {
    this.config.conic = { ...this.config.conic, ...params };
    this.notifyListeners();
  }

  setColorStops(stops: ColorStop[]): void {
    this.config.colorStops = stops;
    this.notifyListeners();
  }

  updateColorStop(id: string, updates: Partial<ColorStop>): void {
    const idx = this.config.colorStops.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.config.colorStops[idx] = { ...this.config.colorStops[idx], ...updates };
      this.notifyListeners();
    }
  }

  addColorStop(): ColorStop | null {
    if (this.config.colorStops.length >= 4) return null;

    const lastStop = this.config.colorStops[this.config.colorStops.length - 1];
    const prevStop = this.config.colorStops[this.config.colorStops.length - 2];
    const newPosition = prevStop
      ? Math.min(100, (lastStop.position + prevStop.position) / 2)
      : Math.min(100, lastStop.position + 25);

    const newStop: ColorStop = {
      id: `stop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      color: lastStop.color,
      alpha: lastStop.alpha,
      position: newPosition
    };

    this.config.colorStops.push(newStop);
    this.notifyListeners();
    return newStop;
  }

  removeColorStop(id: string): boolean {
    if (this.config.colorStops.length <= 2) return false;
    const idx = this.config.colorStops.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.config.colorStops.splice(idx, 1);
    this.notifyListeners();
    return true;
  }

  subscribe(listener: (data: RenderData) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const data = this.getRenderData();
    this.listeners.forEach(fn => fn(data));
  }

  generateCssCode(): string {
    switch (this.config.type) {
      case 'linear':
        return generateLinearCss(this.config);
      case 'radial':
        return generateRadialCss(this.config);
      case 'conic':
        return generateConicCss(this.config);
      default:
        return '';
    }
  }

  renderToCanvas(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.fillStyle = '#2d3436';
    ctx.fillRect(0, 0, width, height);

    switch (this.config.type) {
      case 'linear': {
        const gradient = createLinearCanvasGradient(ctx, width, height, this.config);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        break;
      }
      case 'radial': {
        const gradient = createRadialCanvasGradient(ctx, width, height, this.config);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        break;
      }
      case 'conic': {
        const gradient = createConicCanvasGradient(ctx, width, height, this.config);
        const pattern = (gradient as any)._conicPattern as HTMLCanvasElement;
        if (pattern) {
          ctx.drawImage(pattern, 0, 0);
        } else {
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
        }
        break;
      }
    }
  }

  getRenderData(): RenderData {
    return {
      canvasGradient: null,
      cssCode: this.generateCssCode()
    };
  }
}
