export interface RenderParams {
  axes: number;
  colorRotation: number;
  scale: number;
  mouseX: number;
  mouseY: number;
  centerX: number;
  centerY: number;
  colorStops: string[];
  extraRotation: number;
  extraScale: number;
  fadeAlpha: number;
}

interface CachedSymmetryPoints {
  axes: number;
  mouseX: number;
  mouseY: number;
  centerX: number;
  centerY: number;
  scale: number;
  points: { x: number; y: number; angle: number; distance: number }[];
}

const BASE_COLORS: string[] = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FF6B6B'];

export class KaleidoscopeRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  private cachedPoints: CachedSymmetryPoints | null = null;

  private tempPoints: { x: number; y: number; angle: number; distance: number }[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.cachedPoints = null;
  }

  private hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) =>
      l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x: number) => {
      const hex = Math.round(255 * x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }

  public generateRandomColorStops(): string[] {
    const startHue = Math.random() * 360;
    const endHue = (startHue + 60 + Math.random() * 240) % 360;
    const stops: string[] = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      let hue: number;
      if (endHue > startHue) {
        hue = startHue + (endHue - startHue) * t;
      } else {
        hue = startHue + (360 - startHue + endHue) * t;
        if (hue >= 360) hue -= 360;
      }
      const sat = 65 + Math.random() * 25;
      const light = 50 + Math.random() * 15;
      stops.push(this.hslToHex(hue, sat, light));
    }
    return stops;
  }

  public getDefaultColorStops(): string[] {
    return [...BASE_COLORS];
  }

  private computeSymmetryPoints(
    axes: number,
    mouseX: number,
    mouseY: number,
    centerX: number,
    centerY: number,
    scale: number
  ): { x: number; y: number; angle: number; distance: number }[] {
    if (
      this.cachedPoints &&
      this.cachedPoints.axes === axes &&
      this.cachedPoints.mouseX === mouseX &&
      this.cachedPoints.mouseY === mouseY &&
      this.cachedPoints.centerX === centerX &&
      this.cachedPoints.centerY === centerY &&
      this.cachedPoints.scale === scale
    ) {
      return this.cachedPoints.points;
    }

    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const baseDistance = Math.sqrt(dx * dx + dy * dy) * scale;
    const baseAngle = Math.atan2(dy, dx);

    const numPoints = axes * 2;

    if (this.tempPoints.length < numPoints) {
      const oldLen = this.tempPoints.length;
      this.tempPoints.length = numPoints;
      for (let i = oldLen; i < numPoints; i++) {
        this.tempPoints[i] = { x: 0, y: 0, angle: 0, distance: 0 };
      }
    }

    for (let i = 0; i < axes; i++) {
      const angleOffset = (Math.PI * 2 * i) / axes;

      const mirrorAngle1 = baseAngle + angleOffset;
      const p1 = this.tempPoints[i];
      p1.x = centerX + Math.cos(mirrorAngle1) * baseDistance;
      p1.y = centerY + Math.sin(mirrorAngle1) * baseDistance;
      p1.angle = mirrorAngle1;
      p1.distance = baseDistance;

      const mirrorAngle2 = -baseAngle + angleOffset;
      const p2 = this.tempPoints[i + axes];
      p2.x = centerX + Math.cos(mirrorAngle2) * baseDistance;
      p2.y = centerY + Math.sin(mirrorAngle2) * baseDistance;
      p2.angle = mirrorAngle2;
      p2.distance = baseDistance;
    }

    const result = this.tempPoints.slice(0, numPoints);

    this.cachedPoints = {
      axes,
      mouseX,
      mouseY,
      centerX,
      centerY,
      scale,
      points: result
    };

    return result;
  }

  public render(params: RenderParams): void {
    const {
      axes,
      colorRotation,
      scale,
      mouseX,
      mouseY,
      centerX,
      centerY,
      colorStops,
      extraRotation,
      extraScale,
      fadeAlpha
    } = params;

    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    if (fadeAlpha <= 0.001) return;

    ctx.save();
    ctx.globalAlpha = fadeAlpha;
    ctx.translate(centerX, centerY);
    ctx.rotate(extraRotation);
    ctx.scale(extraScale, extraScale);
    ctx.translate(-centerX, -centerY);

    const points = this.computeSymmetryPoints(axes, mouseX, mouseY, centerX, centerY, scale);

    const sectorAngle = (Math.PI * 2) / axes;
    const maxRadius = Math.max(width, height);

    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const distRatio = Math.min(1, Math.sqrt(dx * dx + dy * dy) / (maxRadius * 0.5));

    const colorRotRad = (colorRotation * Math.PI) / 180;

    for (let i = 0; i < axes; i++) {
      const startAngle = sectorAngle * i - Math.PI / 2 + colorRotRad;
      const endAngle = startAngle + sectorAngle;

      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, maxRadius
      );

      const stops = colorStops.length;
      for (let s = 0; s < stops; s++) {
        const ratio = s / (stops - 1);
        const colorIdx = (s + i) % stops;
        gradient.addColorStop(ratio, colorStops[colorIdx]);
      }

      const pointIdx = i % points.length;
      const point = points[pointIdx];

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, Math.max(point.distance, maxRadius * 0.6), startAngle, endAngle);
      ctx.closePath();

      const dynamicAlpha = 0.5 + distRatio * 0.5;
      ctx.globalAlpha = fadeAlpha * dynamicAlpha;
      ctx.fillStyle = gradient;
      ctx.fill();

      if (point.distance > 2) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4 + distRatio * 8, 0, Math.PI * 2);
        ctx.fillStyle = colorStops[i % colorStops.length];
        ctx.globalAlpha = fadeAlpha * 0.9;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(point.x, point.y, 2 + distRatio * 4, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = fadeAlpha * 0.6;
        ctx.fill();
      }
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  public clear(): void {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
