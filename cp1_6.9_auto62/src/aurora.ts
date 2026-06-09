export const PRESET_COLORS: string[] = [
  '#00ff88',
  '#8a2be2',
  '#ff69b4',
  '#00bfff'
];

export interface AuroraBand {
  id: number;
  color: string;
  targetColor: string;
  baseY: number;
  amplitude: number;
  frequency: number;
  phase: number;
  opacity: number;
  speed: number;
  width: number;
}

const DEFAULT_PRIMARY_COLOR = PRESET_COLORS[0];
const DEFAULT_SPEED_MULTIPLIER = 1.0;
const DEFAULT_BAND_COUNT = 4;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 255, b: 136 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function lerpColor(from: string, to: string, t: number): string {
  const f = hexToRgb(from);
  const tt = hexToRgb(to);
  return rgbToHex(
    f.r + (tt.r - f.r) * t,
    f.g + (tt.g - f.g) * t,
    f.b + (tt.b - f.b) * t
  );
}

function createBand(id: number, primaryColor: string, canvasHeight: number): AuroraBand {
  return {
    id,
    color: primaryColor,
    targetColor: primaryColor,
    baseY: Math.random() * canvasHeight,
    amplitude: 50 + Math.random() * 100,
    frequency: 0.5 + Math.random() * 1.5,
    phase: Math.random() * Math.PI * 2,
    opacity: 0.3 + Math.random() * 0.4,
    speed: 20 + Math.random() * 40,
    width: 60 + Math.random() * 100
  };
}

export class Aurora {
  bands: AuroraBand[] = [];
  speedMultiplier: number = DEFAULT_SPEED_MULTIPLIER;
  bandCount: number = DEFAULT_BAND_COUNT;
  primaryColor: string = DEFAULT_PRIMARY_COLOR;
  targetPrimaryColor: string = DEFAULT_PRIMARY_COLOR;
  colorTransitionProgress: number = 1.0;
  mouseOffset: number = 0;
  canvasWidth: number = 0;
  canvasHeight: number = 0;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.initBands();
  }

  private initBands(): void {
    this.bands = [];
    for (let i = 0; i < this.bandCount; i++) {
      this.bands.push(createBand(i, this.primaryColor, this.canvasHeight));
    }
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  setPrimaryColor(color: string): void {
    this.targetPrimaryColor = color;
    this.colorTransitionProgress = 0.0;
  }

  setSpeed(multiplier: number): void {
    this.speedMultiplier = Math.max(0.5, Math.min(3.0, multiplier));
  }

  setBandCount(count: number): void {
    const clamped = Math.max(3, Math.min(5, Math.round(count)));
    if (clamped === this.bandCount) return;

    this.bandCount = clamped;
    if (clamped > this.bands.length) {
      while (this.bands.length < clamped) {
        this.bands.push(createBand(this.bands.length, this.primaryColor, this.canvasHeight));
      }
    } else {
      this.bands = this.bands.slice(0, clamped);
    }
  }

  setMouseOffset(offset: number): void {
    this.mouseOffset = offset;
  }

  reset(): void {
    this.speedMultiplier = DEFAULT_SPEED_MULTIPLIER;
    this.bandCount = DEFAULT_BAND_COUNT;
    this.setPrimaryColor(DEFAULT_PRIMARY_COLOR);
    this.mouseOffset = 0;
    this.initBands();
  }

  update(deltaTime: number): void {
    if (this.colorTransitionProgress < 1.0) {
      this.colorTransitionProgress = Math.min(1.0, this.colorTransitionProgress + deltaTime / 0.5);
      this.primaryColor = lerpColor(
        this.primaryColor === this.targetPrimaryColor ? DEFAULT_PRIMARY_COLOR : this.primaryColor,
        this.targetPrimaryColor,
        this.colorTransitionProgress
      );
    }

    for (const band of this.bands) {
      if (this.colorTransitionProgress < 1.0) {
        band.color = lerpColor(band.color, this.targetPrimaryColor, deltaTime / 0.5);
      }

      band.phase += band.frequency * deltaTime * this.speedMultiplier;
      band.baseY += band.speed * this.speedMultiplier * deltaTime;

      if (band.baseY - band.amplitude - band.width > this.canvasHeight) {
        band.baseY = -band.amplitude - band.width - Math.random() * this.canvasHeight * 0.5;
        band.amplitude = 50 + Math.random() * 100;
        band.frequency = 0.5 + Math.random() * 1.5;
        band.opacity = 0.3 + Math.random() * 0.4;
        band.speed = 20 + Math.random() * 40;
        band.width = 60 + Math.random() * 100;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.globalCompositeOperation = 'lighter';

    for (const band of this.bands) {
      this.renderBand(ctx, band);
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  private renderBand(ctx: CanvasRenderingContext2D, band: AuroraBand): void {
    const rgb = hexToRgb(band.color);
    const segments = Math.max(40, Math.floor(this.canvasWidth / 20));

    ctx.beginPath();

    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * this.canvasWidth;
      const normalizedX = x / this.canvasWidth;
      const wave = Math.sin(normalizedX * Math.PI * 2 * band.frequency + band.phase) * band.amplitude;
      const y = band.baseY + wave + this.mouseOffset * (normalizedX - 0.5) * 2;

      if (i === 0) {
        ctx.moveTo(x, y - band.width / 2);
      } else {
        ctx.lineTo(x, y - band.width / 2);
      }
    }

    for (let i = segments; i >= 0; i--) {
      const x = (i / segments) * this.canvasWidth;
      const normalizedX = x / this.canvasWidth;
      const wave = Math.sin(normalizedX * Math.PI * 2 * band.frequency + band.phase) * band.amplitude;
      const y = band.baseY + wave + this.mouseOffset * (normalizedX - 0.5) * 2;
      ctx.lineTo(x, y + band.width / 2);
    }

    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, band.baseY - band.width, 0, band.baseY + band.width);
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
    gradient.addColorStop(0.3, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${band.opacity * 0.6})`);
    gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${band.opacity})`);
    gradient.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${band.opacity * 0.6})`);
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

    ctx.fillStyle = gradient;
    ctx.fill();
  }
}
