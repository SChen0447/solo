export type MirrorAxis = 'vertical' | 'horizontal' | 'diagonal';

export interface Point {
  x: number;
  y: number;
}

export interface MirroredPoint extends Point {
  layer: number;
  isOriginal: boolean;
}

export interface ColorHSL {
  h: number;
  s: number;
  l: number;
}

const LAYER_ROTATIONS = [0, 45, 90, 135];
const LAYER_HUE_OFFSETS = [0, 30, 60, 90, 120];

export class MirrorEngine {
  private canvasWidth: number;
  private canvasHeight: number;
  private axis: MirrorAxis = 'vertical';
  private layers: number = 1;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  setAxis(axis: MirrorAxis): void {
    this.axis = axis;
  }

  setLayers(layers: number): void {
    this.layers = Math.max(1, Math.min(4, layers));
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  private hexToHSL(hex: string): ColorHSL {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 0, s: 0, l: 0 };
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  hslToHex(h: number, s: number, l: number): string {
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
    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  getLayerColor(baseColor: string, layer: number, gradientProgress: number = 0): string {
    const hsl = this.hexToHSL(baseColor);
    const layerOffset = LAYER_HUE_OFFSETS[layer] || 0;
    const gradientOffset = gradientProgress * 360;
    let finalHue = (hsl.h + layerOffset + gradientOffset) % 360;
    if (finalHue < 0) finalHue += 360;
    return this.hslToHex(finalHue, hsl.s, hsl.l);
  }

  private reflectVertical(point: Point): Point {
    const centerX = this.canvasWidth / 2;
    return { x: centerX * 2 - point.x, y: point.y };
  }

  private reflectHorizontal(point: Point): Point {
    const centerY = this.canvasHeight / 2;
    return { x: point.x, y: centerY * 2 - point.y };
  }

  private reflectDiagonal(point: Point): Point {
    return { x: point.y, y: point.x };
  }

  private reflect(point: Point): Point {
    switch (this.axis) {
      case 'vertical':
        return this.reflectVertical(point);
      case 'horizontal':
        return this.reflectHorizontal(point);
      case 'diagonal':
        return this.reflectDiagonal(point);
    }
  }

  private rotatePoint(point: Point, angleDeg: number): Point {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    return {
      x: centerX + dx * cos - dy * sin,
      y: centerY + dx * sin + dy * cos
    };
  }

  generateMirroredPoints(point: Point): MirroredPoint[] {
    const result: MirroredPoint[] = [];
    const halfWidth = this.canvasWidth / 2;

    if (point.x <= halfWidth) {
      for (let layer = 0; layer < this.layers; layer++) {
        const rotation = LAYER_ROTATIONS[layer];
        const originalRotated = this.rotatePoint(point, rotation);
        result.push({ ...originalRotated, layer, isOriginal: true });
        const reflected = this.reflect(point);
        const reflectedRotated = this.rotatePoint(reflected, rotation);
        result.push({ ...reflectedRotated, layer, isOriginal: false });
      }
    }

    return result;
  }

  generateMirroredPath(points: Point[]): MirroredPoint[][] {
    if (points.length === 0) return [];
    const paths: MirroredPoint[][] = [];
    for (let layer = 0; layer < this.layers; layer++) {
      paths[layer * 2] = [];
      paths[layer * 2 + 1] = [];
    }

    const halfWidth = this.canvasWidth / 2;

    for (const point of points) {
      if (point.x > halfWidth) continue;
      for (let layer = 0; layer < this.layers; layer++) {
        const rotation = LAYER_ROTATIONS[layer];
        const originalRotated = this.rotatePoint(point, rotation);
        paths[layer * 2].push({ ...originalRotated, layer, isOriginal: true });
        const reflected = this.reflect(point);
        const reflectedRotated = this.rotatePoint(reflected, rotation);
        paths[layer * 2 + 1].push({ ...reflectedRotated, layer, isOriginal: false });
      }
    }

    return paths;
  }
}
