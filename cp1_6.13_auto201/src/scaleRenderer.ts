import { LightController, LightResult } from './lightController';

export interface ColorPalette {
  name: string;
  primary: string;
  gradientStart: string;
  gradientEnd: string;
  glow: string;
}

export const PALETTES: ColorPalette[] = [
  { name: '冰霜蓝', primary: '#00b4d8', gradientStart: '#a8dadc', gradientEnd: '#0077b6', glow: '#7dd3fc' },
  { name: '烈焰橙', primary: '#ff6b35', gradientStart: '#ffbe0b', gradientEnd: '#d62828', glow: '#fbbf24' },
  { name: '暗夜紫', primary: '#9d4edd', gradientStart: '#c77dff', gradientEnd: '#5a189a', glow: '#a78bfa' },
  { name: '翡翠绿', primary: '#2ec4b6', gradientStart: '#95d5b2', gradientEnd: '#1b4332', glow: '#34d399' },
  { name: '星光金', primary: '#ffd60a', gradientStart: '#fff3b0', gradientEnd: '#c9a227', glow: '#fde047' }
];

export const DEFAULT_PALETTE: ColorPalette = {
  name: '默认蓝绿',
  primary: '#00b4d8',
  gradientStart: '#00b4d8',
  gradientEnd: '#0077b6',
  glow: '#7dd3fc'
};

export interface Scale {
  id: string;
  row: number;
  col: number;
  centerX: number;
  centerY: number;
  diameter: number;
  hueOffset: number;
  paletteIndex: number;
  isSelected: boolean;
  isHovered: boolean;
  scale: number;
  targetScale: number;
  rippleProgress: number;
  rippleActive: boolean;
  glowIntensity: number;
}

export interface RenderParams {
  viewRotationY: number;
  lightHeight: number;
  scaleRotation: number;
  activePaletteIndex: number;
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
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
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hNorm = h / 360;

  return [
    Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, hNorm) * 255),
    Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255)
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number): string => {
    const hex = Math.max(0, Math.min(255, Math.round(v))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

function shiftColor(hex: string, hueShift: number, brightnessShift: number): string {
  const [h, s, l] = hexToHsl(hex);
  const newH = h + hueShift;
  const newL = l + brightnessShift * 100;
  const [r, g, b] = hslToRgb(newH, s, newL);
  return rgbToHex(r, g, b);
}

function lerpColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  return rgbToHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t
  );
}

const ROWS = 8;
const COLS = 10;
const SCALE_GAP = 2;

export class ScaleRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lightController: LightController;
  private scales: Scale[] = [];
  private params: RenderParams = {
    viewRotationY: 0,
    lightHeight: 50,
    scaleRotation: 0,
    activePaletteIndex: 0
  };
  private dpr: number = window.devicePixelRatio || 1;
  private logicalWidth: number = 0;
  private logicalHeight: number = 0;

  constructor(canvas: HTMLCanvasElement, lightController: LightController) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.lightController = lightController;
  }

  public resize(width: number, height: number): void {
    this.logicalWidth = width;
    this.logicalHeight = height;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.layoutScales();
  }

  public setDpr(dpr: number): void {
    this.dpr = dpr;
    this.resize(this.logicalWidth, this.logicalHeight);
  }

  public layoutScales(): void {
    const width = this.logicalWidth;
    const height = this.logicalHeight;

    const maxScaleSize = Math.min(
      (width - SCALE_GAP * (COLS + 1)) / (COLS * 0.866),
      (height - SCALE_GAP * (ROWS + 1)) / (ROWS * 0.75 + 0.25)
    );

    const baseDiameter = Math.max(40, Math.min(60, maxScaleSize * 0.9));
    const preservedRandom = this.scales.length > 0
      ? this.scales.map(s => ({ diameter: s.diameter, hueOffset: s.hueOffset }))
      : null;

    const scales: Scale[] = [];
    const horizSpacing = baseDiameter * 0.866 + SCALE_GAP;
    const vertSpacing = baseDiameter * 0.75 + SCALE_GAP;

    const totalWidth = (COLS - 1) * horizSpacing + baseDiameter;
    const totalHeight = (ROWS - 1) * vertSpacing + baseDiameter * 0.5 + baseDiameter * 0.5;
    const startX = (width - totalWidth) / 2 + baseDiameter / 2;
    const startY = (height - totalHeight) / 2 + baseDiameter / 2;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const idx = row * COLS + col;
        const offsetX = row % 2 === 1 ? horizSpacing / 2 : 0;
        const existing = preservedRandom ? preservedRandom[idx] : null;
        const diameter = existing ? existing.diameter : 40 + Math.random() * 20;
        const hueOffset = existing ? existing.hueOffset : (Math.random() - 0.5) * 30;

        scales.push({
          id: `scale-${row}-${col}`,
          row,
          col,
          centerX: startX + col * horizSpacing + offsetX,
          centerY: startY + row * vertSpacing,
          diameter,
          hueOffset,
          paletteIndex: -1,
          isSelected: false,
          isHovered: false,
          scale: 1,
          targetScale: 1,
          rippleProgress: 0,
          rippleActive: false,
          glowIntensity: 0
        });
      }
    }
    this.scales = scales;
  }

  public getScales(): Scale[] {
    return this.scales;
  }

  public getCanvasLogicalSize(): { width: number; height: number } {
    return { width: this.logicalWidth, height: this.logicalHeight };
  }

  public setParams(params: Partial<RenderParams>): void {
    this.params = { ...this.params, ...params };
  }

  public getParams(): RenderParams {
    return this.params;
  }

  public findScaleAt(x: number, y: number): Scale | null {
    for (let i = this.scales.length - 1; i >= 0; i--) {
      const s = this.scales[i];
      const dx = x - s.centerX;
      const dy = y - s.centerY;
      const radius = (s.diameter / 2) * s.scale;
      if (dx * dx + dy * dy <= radius * radius * 0.9) {
        return s;
      }
    }
    return null;
  }

  public getNeighborScales(scale: Scale, range: number = 1): Scale[] {
    const neighbors: Scale[] = [];
    for (const s of this.scales) {
      if (s.id === scale.id) continue;
      const dRow = Math.abs(s.row - scale.row);
      const dCol = Math.abs(s.col - scale.col);
      if (dRow <= range && dCol <= range && (dRow + dCol) <= range + 1) {
        neighbors.push(s);
      }
    }
    return neighbors;
  }

  public resetAll(): void {
    for (const s of this.scales) {
      s.paletteIndex = -1;
      s.isSelected = false;
      s.isHovered = false;
      s.scale = 1;
      s.targetScale = 1;
      s.rippleProgress = 0;
      s.rippleActive = false;
      s.glowIntensity = 0;
    }
  }

  public updateAnimations(deltaTime: number): void {
    for (const s of this.scales) {
      const diff = s.targetScale - s.scale;
      if (Math.abs(diff) > 0.001) {
        s.scale += diff * Math.min(1, deltaTime * 8);
      } else {
        s.scale = s.targetScale;
      }

      if (s.rippleActive) {
        s.rippleProgress += deltaTime * 2.5;
        if (s.rippleProgress >= 1) {
          s.rippleProgress = 0;
          s.rippleActive = false;
        }
      }

      const targetGlow = s.isSelected ? 1 : 0;
      const glowDiff = targetGlow - s.glowIntensity;
      if (Math.abs(glowDiff) > 0.001) {
        s.glowIntensity += glowDiff * Math.min(1, deltaTime * 6);
      } else {
        s.glowIntensity = targetGlow;
      }
    }
  }

  private drawHexagonPath(cx: number, cy: number, radius: number, rotation: number): void {
    const ctx = this.ctx;
    const rotRad = (rotation * Math.PI) / 180;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = rotRad + (i * Math.PI) / 3;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  public render(): void {
    const ctx = this.ctx;
    const width = this.logicalWidth;
    const height = this.logicalHeight;

    ctx.clearRect(0, 0, width, height);

    this.lightController.setLightHeight(this.params.lightHeight);
    this.lightController.setViewRotationY(this.params.viewRotationY);

    const sortedScales = [...this.scales].sort((a, b) => {
      const ax = (a.centerX - width / 2) * Math.cos(this.params.viewRotationY);
      const bx = (b.centerX - width / 2) * Math.cos(this.params.viewRotationY);
      return ax - bx;
    });

    for (const s of sortedScales) {
      this.renderScale(s);
    }
  }

  private renderScale(s: Scale): void {
    const ctx = this.ctx;
    const width = this.logicalWidth;
    const height = this.logicalHeight;

    const dx = s.centerX - width / 2;
    const projX = dx * Math.cos(this.params.viewRotationY);
    const renderX = width / 2 + projX;
    const renderY = s.centerY;

    let rippleScale = 1;
    if (s.rippleActive) {
      const t = s.rippleProgress;
      rippleScale = 1 + Math.sin(t * Math.PI) * 0.2;
    }

    const finalScale = s.scale * rippleScale;
    const radius = (s.diameter / 2) * finalScale;

    const normalX = -Math.sin(this.params.viewRotationY) * 0.3;
    const normalY = 0;
    const light: LightResult = this.lightController.calculateLight(
      renderX, renderY, normalX, normalY, width, height
    );

    const palette = s.paletteIndex >= 0
      ? PALETTES[s.paletteIndex]
      : DEFAULT_PALETTE;

    const gradientStart = shiftColor(palette.gradientStart, s.hueOffset + light.hueShift, light.brightnessShift);
    const gradientEnd = shiftColor(palette.gradientEnd, s.hueOffset + light.hueShift, light.brightnessShift);

    if (s.glowIntensity > 0) {
      ctx.save();
      this.drawHexagonPath(renderX, renderY, radius * 1.4, this.params.scaleRotation);
      const glowColor = palette.glow;
      const glowR = parseInt(glowColor.slice(1, 3), 16);
      const glowG = parseInt(glowColor.slice(3, 5), 16);
      const glowB = parseInt(glowColor.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${glowR}, ${glowG}, ${glowB}, ${0.4 * s.glowIntensity})`;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 30 * s.glowIntensity;
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    this.drawHexagonPath(renderX, renderY, radius, this.params.scaleRotation);
    ctx.clip();

    const grad = ctx.createLinearGradient(
      renderX - radius, renderY - radius,
      renderX + radius, renderY + radius
    );
    grad.addColorStop(0, gradientStart);
    grad.addColorStop(1, gradientEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(renderX - radius, renderY - radius, radius * 2, radius * 2);

    if (light.specularIntensity > 0) {
      const specGrad = ctx.createRadialGradient(
        renderX - radius * 0.3, renderY - radius * 0.3, 0,
        renderX, renderY, radius
      );
      specGrad.addColorStop(0, `rgba(255, 255, 255, ${light.specularIntensity * 0.6})`);
      specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = specGrad;
      ctx.fillRect(renderX - radius, renderY - radius, radius * 2, radius * 2);
    }

    if (s.isHovered) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(renderX - radius, renderY - radius, radius * 2, radius * 2);
    }

    ctx.restore();

    ctx.save();
    this.drawHexagonPath(renderX, renderY, radius, this.params.scaleRotation);

    if (s.isHovered) {
      ctx.strokeStyle = '#e0e0ff';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#e0e0ff';
      ctx.shadowBlur = 8;
    } else {
      ctx.strokeStyle = lerpColor(gradientEnd, '#000000', 0.4);
      ctx.lineWidth = 1;
    }
    ctx.stroke();
    ctx.restore();

    ctx.save();
    this.drawHexagonPath(renderX, renderY, radius * 0.7, this.params.scaleRotation);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 + light.specularIntensity * 0.15})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }
}
