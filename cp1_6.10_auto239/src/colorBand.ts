export interface BandPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ColorStop {
  hour: number;
  r: number;
  g: number;
  b: number;
  kelvin: number;
}

interface RenderParams {
  haloIntensity: number;
  flowSpeed: number;
}

const COLOR_STOPS: ColorStop[] = [
  { hour: 0, r: 74, g: 144, b: 217, kelvin: 2000 },
  { hour: 4, r: 100, g: 160, b: 230, kelvin: 3500 },
  { hour: 6, r: 255, g: 180, b: 130, kelvin: 4000 },
  { hour: 8, r: 255, g: 230, b: 180, kelvin: 5000 },
  { hour: 12, r: 255, g: 251, b: 230, kelvin: 6500 },
  { hour: 16, r: 255, g: 220, b: 170, kelvin: 5000 },
  { hour: 18, r: 255, g: 140, b: 80, kelvin: 3500 },
  { hour: 20, r: 180, g: 80, b: 160, kelvin: 2500 },
  { hour: 22, r: 140, g: 70, b: 200, kelvin: 1800 },
  { hour: 24, r: 124, g: 58, b: 237, kelvin: 1500 },
];

const STIFFNESS = 0.08;
const DAMPING = 0.82;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(v)));
    const h = clamped.toString(16);
    return h.length === 1 ? '0' + h : h;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function getColorAtHour(hour: number): { hex: string; kelvin: number; r: number; g: number; b: number } {
  const h = ((hour % 24) + 24) % 24;

  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const s1 = COLOR_STOPS[i];
    const s2 = COLOR_STOPS[i + 1];
    if (h >= s1.hour && h <= s2.hour) {
      const t = (h - s1.hour) / (s2.hour - s1.hour);
      const r = lerp(s1.r, s2.r, t);
      const g = lerp(s1.g, s2.g, t);
      const b = lerp(s1.b, s2.b, t);
      const kelvin = lerp(s1.kelvin, s2.kelvin, t);
      return { hex: rgbToHex(r, g, b), kelvin: Math.round(kelvin), r, g, b };
    }
  }
  return { hex: '#4a90d9', kelvin: 2000, r: 74, g: 144, b: 217 };
}

export class ColorBand {
  private ctx: CanvasRenderingContext2D;
  private params: RenderParams = { haloIntensity: 5, flowSpeed: 1 };
  private virtualHour: number = 0;
  private cursorX: number = 0;
  private cursorVelocity: number = 0;
  private targetCursorX: number = 0;
  private lastBandPos: BandPosition = { x: 0, y: 0, width: 0, height: 0 };
  private timeOffsetMs: number = 0;
  private flowPhase: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.resetToRealTime();
  }

  setParams(params: Partial<RenderParams>): void {
    this.params = { ...this.params, ...params };
  }

  setDragOffset(offsetHours: number): void {
    this.virtualHour = this.getRealHour() + offsetHours;
  }

  setVirtualHourFromPixel(pixelX: number, bandPos: BandPosition): void {
    const t = Math.max(0, Math.min(1, (pixelX - bandPos.x) / bandPos.width));
    this.virtualHour = t * 24;
  }

  resetToRealTime(): void {
    this.timeOffsetMs = 0;
    this.virtualHour = this.getRealHour();
  }

  private getRealHour(): number {
    const now = new Date();
    return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600 + now.getMilliseconds() / 3600000;
  }

  getCurrentHour(): number {
    return this.virtualHour;
  }

  getCurrentTime(): { hours: number; minutes: number; seconds: number; timeStr: string } {
    const h = this.virtualHour;
    const hours = Math.floor(h);
    const minutes = Math.floor((h - hours) * 60);
    const seconds = Math.floor(((h - hours) * 60 - minutes) * 60);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return {
      hours,
      minutes,
      seconds,
      timeStr: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
    };
  }

  getCursorX(): number {
    return this.cursorX;
  }

  getCurrentColorInfo(): { hex: string; kelvin: number } {
    return getColorAtHour(this.virtualHour);
  }

  update(deltaTimeMs: number, isDragging: boolean): void {
    const dt = deltaTimeMs / 1000;
    if (!isDragging) {
      this.virtualHour += (dt / 3600) * this.params.flowSpeed * 1000;
      this.virtualHour = this.virtualHour % 24;
      if (this.virtualHour < 0) this.virtualHour += 24;
    }
    this.flowPhase += dt * this.params.flowSpeed * 0.3;
    this.targetCursorX = this.hourToPixel(this.virtualHour, this.lastBandPos);
    this.cursorVelocity += (this.targetCursorX - this.cursorX) * STIFFNESS;
    this.cursorVelocity *= DAMPING;
    this.cursorX += this.cursorVelocity;
  }

  private hourToPixel(hour: number, bandPos: BandPosition): number {
    const h = ((hour % 24) + 24) % 24;
    return bandPos.x + (h / 24) * bandPos.width;
  }

  setBandPosition(bandPos: BandPosition): void {
    this.lastBandPos = bandPos;
    this.targetCursorX = this.hourToPixel(this.virtualHour, bandPos);
    if (Math.abs(this.cursorX) < 1) {
      this.cursorX = this.targetCursorX;
    }
  }

  render(bandPos: BandPosition): void {
    this.lastBandPos = bandPos;
    this.renderBand(bandPos);
    this.renderCursor(bandPos);
  }

  private renderBand(bandPos: BandPosition): void {
    const ctx = this.ctx;
    const { x, y, width, height } = bandPos;
    const radius = height * 0.3;

    ctx.save();
    this.roundRectPath(ctx, x, y, width, height, radius);
    ctx.clip();

    const grad = ctx.createLinearGradient(x, y, x + width, y);
    const stops = [
      { t: 0, hex: '#4a90d9' },
      { t: 0.25, hex: '#8ab6f0' },
      { t: 0.5, hex: '#fffbe6' },
      { t: 0.75, hex: '#ff8c5a' },
      { t: 1, hex: '#7c3aed' },
    ];

    for (const stop of stops) {
      const phaseOffset = Math.sin(this.flowPhase + stop.t * Math.PI * 2) * 0.01;
      const t = Math.max(0, Math.min(1, stop.t + phaseOffset));
      grad.addColorStop(t, stop.hex);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, width, height);

    ctx.restore();

    ctx.save();
    ctx.shadowColor = 'rgba(100, 150, 255, 0.15)';
    ctx.shadowBlur = 30;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    this.roundRectPath(ctx, x, y, width, height, radius);
    ctx.stroke();
    ctx.restore();
  }

  private renderCursor(bandPos: BandPosition): void {
    const ctx = this.ctx;
    const { x, y, width, height } = bandPos;
    const cx = this.cursorX;
    if (cx < x - 50 || cx > x + width + 50) return;

    const cursorHeight = height * 1.2;
    const cursorY = y + (height - cursorHeight) / 2;
    const haloBase = this.params.haloIntensity / 10;
    const haloRadius = 15 + haloBase * 30;
    const haloAlpha = 0.15 + haloBase * 0.25;

    const color = getColorAtHour(this.virtualHour);

    const pulse = 0.85 + Math.sin(Date.now() * 0.004) * 0.15;

    const drawHalo = (cy: number) => {
      const haloGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloRadius * pulse);
      haloGrad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${haloAlpha})`);
      haloGrad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, haloRadius * pulse, 0, Math.PI * 2);
      ctx.fill();
    };

    drawHalo(y);
    drawHalo(y + height);

    ctx.save();
    ctx.shadowColor = `rgba(255, 255, 255, ${0.6 * pulse})`;
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1, cursorY, 2, cursorHeight);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, y + height / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.8)`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  private roundRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
