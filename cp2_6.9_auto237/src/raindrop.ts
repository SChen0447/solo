import { GradientDirection } from './config';

export interface RaindropOptions {
  columnIndex: number;
  columnWidth: number;
  fontSize: number;
  canvasHeight: number;
  charset: string;
  speedMultiplier: number;
}

export class RaindropColumn {
  private x: number;
  private y: number = 0;
  private columnWidth: number;
  private fontSize: number;
  private canvasHeight: number;
  private charset: string;
  private characters: string[] = [];
  private speed: number;
  private columnIndex: number;
  private maxLength: number;
  private charHeight: number;

  constructor(options: RaindropOptions) {
    this.columnIndex = options.columnIndex;
    this.columnWidth = options.columnWidth;
    this.fontSize = options.fontSize;
    this.canvasHeight = options.canvasHeight;
    this.charset = options.charset;
    this.x = options.columnIndex * options.columnWidth;
    this.charHeight = options.fontSize * 1.1;
    this.maxLength = Math.floor(options.canvasHeight / this.charHeight) + 10;
    this.speed = (0.5 + Math.random() * 1.5) * options.speedMultiplier;
    this.reset(true);
  }

  private randomChar(): string {
    if (this.charset.length === 0) return ' ';
    return this.charset.charAt(Math.floor(Math.random() * this.charset.length));
  }

  reset(initialPosition: boolean = false): void {
    this.characters = [];
    const length = Math.min(15 + Math.floor(Math.random() * 25), this.maxLength);
    for (let i = 0; i < length; i++) {
      this.characters.push(this.randomChar());
    }
    if (initialPosition) {
      this.y = -Math.random() * this.canvasHeight;
    } else {
      this.y = -this.characters.length * this.charHeight - Math.random() * 200;
    }
  }

  setCharset(charset: string): void {
    this.charset = charset;
    for (let i = 0; i < this.characters.length; i++) {
      this.characters[i] = this.randomChar();
    }
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speed = (0.5 + Math.random() * 1.5) * multiplier;
  }

  setColumnIndex(columnIndex: number): void {
    this.columnIndex = columnIndex;
    this.x = columnIndex * this.columnWidth;
  }

  setCanvasHeight(canvasHeight: number): void {
    this.canvasHeight = canvasHeight;
    this.maxLength = Math.floor(canvasHeight / this.charHeight) + 10;
  }

  update(deltaTime: number): void {
    const pixelSpeed = this.speed * 60 * deltaTime * 0.05;
    this.y += pixelSpeed;

    if (Math.random() < 0.02) {
      const randomIndex = Math.floor(Math.random() * this.characters.length);
      this.characters[randomIndex] = this.randomChar();
    }

    if (this.y > this.canvasHeight + this.characters.length * this.charHeight) {
      this.reset();
    }
  }

  private getColorGradient(
    charIndex: number,
    totalChars: number,
    totalColumns: number,
    direction: GradientDirection
  ): string {
    if (charIndex === 0) {
      return '#FFFFFF';
    }

    let t: number;
    switch (direction) {
      case 'horizontal':
        t = this.columnIndex / Math.max(1, totalColumns - 1);
        break;
      case 'diagonal': {
        const verticalT = charIndex / Math.max(1, totalChars - 1);
        const horizontalT = this.columnIndex / Math.max(1, totalColumns - 1);
        t = (verticalT + horizontalT) / 2;
        break;
      }
      case 'vertical':
      default:
        t = charIndex / Math.max(1, totalChars - 1);
        break;
    }

    const r = Math.floor(0 * (1 - t));
    const g = Math.floor(255 * (1 - t) + 51 * t);
    const b = Math.floor(0 * (1 - t));
    return `rgb(${r}, ${g}, ${b})`;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    totalColumns: number,
    direction: GradientDirection
  ): void {
    ctx.font = `${this.fontSize}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let i = 0; i < this.characters.length; i++) {
      const charY = this.y + i * this.charHeight;
      if (charY < -this.charHeight || charY > this.canvasHeight) {
        continue;
      }

      const color = this.getColorGradient(i, this.characters.length, totalColumns, direction);
      ctx.fillStyle = color;
      ctx.fillText(
        this.characters[i],
        this.x + this.columnWidth / 2,
        charY
      );
    }
  }
}

export interface LightBeam {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  speedX: number;
  speedY: number;
  opacity: number;
}

const GLOW_COLORS = ['#FF00FF', '#00FFFF', '#FFFF00'];

export function createLightBeam(canvasWidth: number, canvasHeight: number): LightBeam {
  return {
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    width: 20 + Math.random() * 80,
    height: 100 + Math.random() * 300,
    color: GLOW_COLORS[Math.floor(Math.random() * GLOW_COLORS.length)],
    speedX: (Math.random() - 0.5) * 2,
    speedY: 0.5 + Math.random() * 1.5,
    opacity: 0
  };
}

export function updateLightBeam(
  beam: LightBeam,
  canvasWidth: number,
  canvasHeight: number,
  intensity: number,
  deltaTime: number
): void {
  const speedFactor = 60 * deltaTime;
  beam.x += beam.speedX * speedFactor;
  beam.y += beam.speedY * speedFactor;

  const targetOpacity = intensity * 0.3;
  beam.opacity += (targetOpacity - beam.opacity) * 0.02;

  if (beam.y > canvasHeight + beam.height) {
    beam.y = -beam.height;
    beam.x = Math.random() * canvasWidth;
  }
  if (beam.x < -beam.width) {
    beam.x = canvasWidth;
  }
  if (beam.x > canvasWidth) {
    beam.x = -beam.width;
  }
}

export function drawLightBeam(ctx: CanvasRenderingContext2D, beam: LightBeam): void {
  if (beam.opacity <= 0) return;

  const gradient = ctx.createLinearGradient(beam.x, beam.y, beam.x, beam.y + beam.height);
  gradient.addColorStop(0, hexToRgba(beam.color, 0));
  gradient.addColorStop(0.3, hexToRgba(beam.color, beam.opacity));
  gradient.addColorStop(0.7, hexToRgba(beam.color, beam.opacity));
  gradient.addColorStop(1, hexToRgba(beam.color, 0));

  ctx.fillStyle = gradient;
  ctx.fillRect(beam.x, beam.y, beam.width, beam.height);
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
