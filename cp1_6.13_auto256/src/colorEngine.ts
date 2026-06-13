export type ThemeMode = 'warm' | 'cool' | 'contrast' | 'random';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

const hexToRgb = (hex: string): RGB => {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
};

const rgbToHex = (rgb: RGB): string => {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lerpColor = (c1: RGB, c2: RGB, t: number): RGB => ({
  r: lerp(c1.r, c2.r, t),
  g: lerp(c1.g, c2.g, t),
  b: lerp(c1.b, c2.b, t),
});

const rgbToString = (rgb: RGB, alpha = 1): string => {
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
};

const adjustBrightness = (rgb: RGB, factor: number): RGB => ({
  r: Math.min(255, rgb.r * factor),
  g: Math.min(255, rgb.g * factor),
  b: Math.min(255, rgb.b * factor),
});

const DEFAULT_PALETTE: string[] = [
  '#ff6b6b',
  '#ff8e72',
  '#ff9ff3',
  '#a29bfe',
  '#54a0ff',
  '#48dbfb',
  '#1dd1a1',
  '#5f27cd',
  '#feca57',
  '#ee5a6f',
  '#00d2d3',
  '#8B5CF6',
];

const WARM_PALETTE: string[] = [
  '#ff6b6b',
  '#ff8e72',
  '#ffa502',
  '#ff7f50',
  '#feca57',
  '#ff9ff3',
  '#ee5a6f',
  '#ff6348',
  '#e17055',
  '#fdcb6e',
  '#fab1a0',
  '#e84393',
];

const COOL_PALETTE: string[] = [
  '#54a0ff',
  '#48dbfb',
  '#1dd1a1',
  '#00d2d3',
  '#a29bfe',
  '#6c5ce7',
  '#5f27cd',
  '#0984e3',
  '#74b9ff',
  '#81ecec',
  '#55efc4',
  '#a29bfe',
];

const CONTRAST_PALETTE: string[] = [
  '#ff6b6b',
  '#48dbfb',
  '#feca57',
  '#5f27cd',
  '#1dd1a1',
  '#ff9ff3',
  '#00d2d3',
  '#ee5a6f',
  '#54a0ff',
  '#fdcb6e',
  '#a29bfe',
  '#ff6348',
];

const generateRandomPalette = (): string[] => {
  const hue = Math.random() * 360;
  const palette: string[] = [];
  for (let i = 0; i < 12; i++) {
    const h = (hue + i * 30 + Math.random() * 15) % 360;
    const s = 65 + Math.random() * 25;
    const l = 55 + Math.random() * 15;
    palette.push(hslToHex(h, s, l));
  }
  return palette;
};

const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
};

export class ColorEngine {
  private palette: string[] = [...DEFAULT_PALETTE];
  private targetPalette: string[] = [...DEFAULT_PALETTE];
  private transitionProgress: number = 1;
  private transitionDuration: number = 1.5;
  private mouseX: number = 0.5;
  private mouseY: number = 0.5;
  private activeSectorIndex: number = 0;
  private currentTheme: ThemeMode = 'warm';

  constructor() {
    this.updateActiveSector();
  }

  getPalette(): string[] {
    if (this.transitionProgress >= 1) {
      return this.palette;
    }
    return this.palette.map((color, i) => {
      const from = hexToRgb(color);
      const to = hexToRgb(this.targetPalette[i]);
      return rgbToHex(lerpColor(from, to, this.transitionProgress));
    });
  }

  getRawPalette(): string[] {
    return this.palette;
  }

  switchTheme(theme: ThemeMode): void {
    this.currentTheme = theme;
    this.targetPalette = this.getThemePalette(theme);
    this.transitionProgress = 0;
  }

  getCurrentTheme(): ThemeMode {
    return this.currentTheme;
  }

  private getThemePalette(theme: ThemeMode): string[] {
    switch (theme) {
      case 'warm':
        return [...WARM_PALETTE];
      case 'cool':
        return [...COOL_PALETTE];
      case 'contrast':
        return [...CONTRAST_PALETTE];
      case 'random':
        return generateRandomPalette();
      default:
        return [...DEFAULT_PALETTE];
    }
  }

  updateTransition(deltaTime: number): void {
    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + deltaTime / this.transitionDuration);
      if (this.transitionProgress >= 1) {
        this.palette = [...this.targetPalette];
      }
    }
  }

  setMousePosition(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
    this.updateActiveSector();
  }

  getMousePosition(): { x: number; y: number } {
    return { x: this.mouseX, y: this.mouseY };
  }

  private updateActiveSector(): void {
    const angle = Math.atan2(this.mouseY - 0.5, this.mouseX - 0.5);
    const normalized = ((angle + Math.PI) / (2 * Math.PI) + 0.75) % 1;
    this.activeSectorIndex = Math.floor(normalized * 12);
  }

  getActiveSectorIndex(): number {
    return this.activeSectorIndex;
  }

  getCurrentColor(): string {
    const palette = this.getPalette();
    return palette[this.activeSectorIndex];
  }

  getCurrentColorRGB(): RGB {
    return hexToRgb(this.getCurrentColor());
  }

  getGradientColors(): { top: string; bottom: string } {
    const palette = this.getPalette();
    const idx = this.activeSectorIndex;
    const nextIdx = (idx + 1) % 12;
    const t = ((this.mouseX + this.mouseY) / 2);
    const top = hexToRgb(palette[idx]);
    const bottom = hexToRgb(palette[nextIdx]);
    const mixed = lerpColor(top, bottom, t);
    const darkTop = adjustBrightness(mixed, 0.35);
    const lightBottom = adjustBrightness(mixed, 0.7);
    return {
      top: rgbToString(darkTop),
      bottom: rgbToString(lightBottom),
    };
  }

  getSectorColors(): { fill: string; highlight: string }[] {
    const palette = this.getPalette();
    return palette.map((color, i) => {
      const rgb = hexToRgb(color);
      const isActive = i === this.activeSectorIndex;
      const highlightRgb = isActive ? adjustBrightness(rgb, 1.3) : rgb;
      return {
        fill: rgbToString(rgb, 0.6),
        highlight: rgbToString(highlightRgb, isActive ? 0.95 : 0.7),
      };
    });
  }

  getWaveformColors(count: number): string[] {
    const palette = this.getPalette();
    const colors: string[] = [];
    const step = Math.floor(12 / count);
    for (let i = 0; i < count; i++) {
      colors.push(palette[(this.activeSectorIndex + i * step) % 12]);
    }
    return colors;
  }

  getRandomPaletteColor(): string {
    const palette = this.getPalette();
    return palette[Math.floor(Math.random() * palette.length)];
  }

  static hexToRgb = hexToRgb;
  static rgbToHex = rgbToHex;
  static lerpColor = lerpColor;
  static rgbToString = rgbToString;
  static adjustBrightness = adjustBrightness;
}
