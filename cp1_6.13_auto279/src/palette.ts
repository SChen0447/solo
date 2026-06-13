export interface ThemeColors {
  name: string;
  colors: [string, string, string, string, string];
}

export const THEMES: ThemeColors[] = [
  {
    name: '火焰',
    colors: ['#ff2200', '#ff5500', '#ff8800', '#ffaa00', '#ffdd44'],
  },
  {
    name: '深海',
    colors: ['#003355', '#005577', '#007799', '#0099bb', '#00ccee'],
  },
  {
    name: '极光',
    colors: ['#00ff88', '#00ddcc', '#5599ff', '#8855ff', '#cc44ff'],
  },
  {
    name: '暮光',
    colors: ['#550044', '#882255', '#bb4466', '#dd6688', '#ffaa77'],
  },
  {
    name: '森林',
    colors: ['#224422', '#336644', '#448855', '#66aa77', '#99ddaa'],
  },
  {
    name: '霓虹',
    colors: ['#ff00cc', '#ff0066', '#ff4400', '#00ffcc', '#aa00ff'],
  },
];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('')
  );
}

function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(
    ca[0] + (cb[0] - ca[0]) * t,
    ca[1] + (cb[1] - ca[1]) * t,
    ca[2] + (cb[2] - ca[2]) * t
  );
}

function brightenAndDesaturate(hex: string, speedFactor: number): string {
  const rgb = hexToRgb(hex);
  const r = rgb[0], g = rgb[1], b = rgb[2];
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  const desaturated: [number, number, number] = [
    r + (gray - r) * speedFactor * 0.6,
    g + (gray - g) * speedFactor * 0.6,
    b + (gray - b) * speedFactor * 0.6,
  ];
  const brightened: [number, number, number] = [
    desaturated[0] + (255 - desaturated[0]) * speedFactor * 0.4,
    desaturated[1] + (255 - desaturated[1]) * speedFactor * 0.4,
    desaturated[2] + (255 - desaturated[2]) * speedFactor * 0.4,
  ];
  return rgbToHex(brightened[0], brightened[1], brightened[2]);
}

export class Palette {
  private currentThemeIndex: number = 2;
  private previousThemeIndex: number = 2;
  private transitionProgress: number = 1;
  private transitionStartTime: number = 0;
  private readonly transitionDuration: number = 5000;

  get currentTheme(): ThemeColors {
    return THEMES[this.currentThemeIndex];
  }

  get themeIndex(): number {
    return this.currentThemeIndex;
  }

  setTheme(index: number): void {
    if (index < 0 || index >= THEMES.length || index === this.currentThemeIndex) return;
    this.previousThemeIndex = this.currentThemeIndex;
    this.currentThemeIndex = index;
    this.transitionProgress = 0;
    this.transitionStartTime = performance.now();
  }

  update(): void {
    if (this.transitionProgress < 1) {
      const elapsed = performance.now() - this.transitionStartTime;
      this.transitionProgress = Math.min(1, elapsed / this.transitionDuration);
    }
  }

  getColor(normalizedX: number, normalizedY: number, speed: number): string {
    const pos = (normalizedX + normalizedY) / 2;
    const colorIndex = pos * 4;
    const i = Math.floor(colorIndex);
    const frac = colorIndex - i;
    const clampedI = Math.min(i, 3);

    const prevTheme = THEMES[this.previousThemeIndex];
    const currTheme = THEMES[this.currentThemeIndex];

    const fromA = prevTheme.colors[clampedI];
    const fromB = prevTheme.colors[Math.min(clampedI + 1, 4)];
    const toA = currTheme.colors[clampedI];
    const toB = currTheme.colors[Math.min(clampedI + 1, 4)];

    const fromColor = lerpColor(fromA, fromB, frac);
    const toColor = lerpColor(toA, toB, frac);

    const t = this.easeInOutCubic(this.transitionProgress);
    const baseColor = lerpColor(fromColor, toColor, t);

    const speedFactor = Math.min(1, speed / 15);
    return brightenAndDesaturate(baseColor, speedFactor);
  }

  getTransitionedColor(colorIndex: number): string {
    const idx = Math.max(0, Math.min(4, colorIndex));
    const prevColor = THEMES[this.previousThemeIndex].colors[idx];
    const currColor = THEMES[this.currentThemeIndex].colors[idx];
    const t = this.easeInOutCubic(this.transitionProgress);
    return lerpColor(prevColor, currColor, t);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
