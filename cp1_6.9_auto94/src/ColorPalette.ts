export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ColorTheme {
  name: string;
  colors: RGB[];
}

export const colorThemes: ColorTheme[] = [
  {
    name: '霓虹城市',
    colors: [
      { r: 255, g: 0,   b: 128 },
      { r: 0,   g: 255, b: 255 },
      { r: 255, g: 255, b: 0 },
      { r: 191, g: 0,   b: 255 },
      { r: 0,   g: 200, b: 255 },
      { r: 255, g: 100, b: 200 }
    ]
  },
  {
    name: '森林极光',
    colors: [
      { r: 0,   g: 255, b: 128 },
      { r: 0,   g: 180, b: 80 },
      { r: 100, g: 255, b: 200 },
      { r: 180, g: 255, b: 100 },
      { r: 0,   g: 100, b: 50 },
      { r: 150, g: 255, b: 150 }
    ]
  },
  {
    name: '熔岩海洋',
    colors: [
      { r: 255, g: 50,  b: 0 },
      { r: 255, g: 150, b: 0 },
      { r: 255, g: 200, b: 50 },
      { r: 200, g: 0,   b: 100 },
      { r: 255, g: 100, b: 50 },
      { r: 150, g: 0,   b: 50 }
    ]
  },
  {
    name: '深海珊瑚',
    colors: [
      { r: 0,   g: 100, b: 200 },
      { r: 255, g: 128, b: 128 },
      { r: 0,   g: 200, b: 255 },
      { r: 255, g: 80,  b: 160 },
      { r: 50,  g: 50,  b: 200 },
      { r: 255, g: 180, b: 200 }
    ]
  },
  {
    name: '星际银河',
    colors: [
      { r: 138, g: 43,  b: 226 },
      { r: 75,  g: 0,   b: 130 },
      { r: 255, g: 215, b: 0 },
      { r: 238, g: 130, b: 238 },
      { r: 0,   g: 255, b: 127 },
      { r: 173, g: 216, b: 230 }
    ]
  },
  {
    name: '糖果梦境',
    colors: [
      { r: 255, g: 182, b: 193 },
      { r: 173, g: 216, b: 230 },
      { r: 255, g: 218, b: 185 },
      { r: 221, g: 160, b: 221 },
      { r: 189, g: 252, b: 201 },
      { r: 255, g: 255, b: 224 }
    ]
  },
  {
    name: '赛博朋克',
    colors: [
      { r: 252, g: 15,  b: 192 },
      { r: 0,   g: 255, b: 255 },
      { r: 255, g: 235, b: 59 },
      { r: 124, g: 58,  b: 237 },
      { r: 0,   g: 230, b: 118 },
      { r: 244, g: 67,  b: 54 }
    ]
  },
  {
    name: '日落黄昏',
    colors: [
      { r: 255, g: 94,  b: 77 },
      { r: 255, g: 149, b: 0 },
      { r: 255, g: 204, b: 0 },
      { r: 184, g: 95,  b: 255 },
      { r: 255, g: 61,  b: 127 },
      { r: 255, g: 188, b: 158 }
    ]
  }
];

export function rgbToString(rgb: RGB, alpha: number = 1): string {
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
}

export function getComplementary(rgb: RGB): RGB {
  return {
    r: 255 - rgb.r,
    g: 255 - rgb.g,
    b: 255 - rgb.b
  };
}

export function lerpColor(a: RGB, b: RGB, t: number): RGB {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    r: a.r + (b.r - a.r) * clamped,
    g: a.g + (b.g - a.g) * clamped,
    b: a.b + (b.b - a.b) * clamped
  };
}

export function getAverageColor(theme: ColorTheme): RGB {
  const n = theme.colors.length;
  let r = 0, g = 0, b = 0;
  for (const c of theme.colors) {
    r += c.r;
    g += c.g;
    b += c.b;
  }
  return { r: r / n, g: g / n, b: b / n };
}

export class ColorPalette {
  private currentIndex: number = 0;
  private previousIndex: number = 0;
  private transitionProgress: number = 1;
  private transitionDuration: number = 0.3;
  private transitionStartTime: number = 0;
  private isTransitioning: boolean = false;

  public getCurrentTheme(): ColorTheme {
    return colorThemes[this.currentIndex];
  }

  public getPreviousTheme(): ColorTheme {
    return colorThemes[this.previousIndex];
  }

  public getTransitionProgress(): number {
    return this.transitionProgress;
  }

  public getIsTransitioning(): boolean {
    return this.isTransitioning;
  }

  public nextTheme(): void {
    if (this.isTransitioning) {
      return;
    }
    this.previousIndex = this.currentIndex;
    this.currentIndex = (this.currentIndex + 1) % colorThemes.length;
    this.isTransitioning = true;
    this.transitionStartTime = performance.now();
    this.transitionProgress = 0;
  }

  public update(deltaTime: number): void {
    if (!this.isTransitioning) {
      return;
    }
    const elapsed = (performance.now() - this.transitionStartTime) / 1000;
    this.transitionProgress = Math.min(1, elapsed / this.transitionDuration);
    if (this.transitionProgress >= 1) {
      this.isTransitioning = false;
      this.transitionProgress = 1;
    }
  }

  public getInterpolatedColor(colorIndex: number): RGB {
    const prevTheme = this.getPreviousTheme();
    const currTheme = this.getCurrentTheme();
    const prevColor = prevTheme.colors[colorIndex % prevTheme.colors.length];
    const currColor = currTheme.colors[colorIndex % currTheme.colors.length];
    return lerpColor(prevColor, currColor, this.transitionProgress);
  }

  public getRandomColor(): { rgb: RGB; index: number } {
    const theme = this.getCurrentTheme();
    const index = Math.floor(Math.random() * theme.colors.length);
    return { rgb: theme.colors[index], index };
  }

  public getInterpolatedBackgroundColor(): RGB {
    const prevAvg = getAverageColor(this.getPreviousTheme());
    const currAvg = getAverageColor(this.getCurrentTheme());
    return lerpColor(prevAvg, currAvg, this.transitionProgress);
  }
}
