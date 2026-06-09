export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export interface SeasonPalette {
  name: string;
  label: string;
  colors: HSLColor[];
}

export class ColorPalette {
  private currentSeason: Season;
  private nextSeason: Season;
  private palettes: Record<Season, SeasonPalette>;
  private transitionProgress: number;
  private isTransitioning: boolean;
  private transitionDuration: number;
  private transitionStartTime: number;
  private diffusionSources: { x: number; y: number; radius: number; color: HSLColor; strength: number }[];

  constructor() {
    this.currentSeason = 'spring';
    this.nextSeason = 'summer';
    this.transitionProgress = 1;
    this.isTransitioning = false;
    this.transitionDuration = 5000;
    this.transitionStartTime = 0;
    this.diffusionSources = [];

    this.palettes = {
      spring: {
        name: 'spring',
        label: '春',
        colors: [
          { h: 340, s: 70, l: 85 },
          { h: 350, s: 60, l: 80 },
          { h: 120, s: 50, l: 82 },
          { h: 140, s: 45, l: 78 },
          { h: 60, s: 55, l: 88 },
          { h: 300, s: 40, l: 85 },
          { h: 180, s: 40, l: 82 }
        ]
      },
      summer: {
        name: 'summer',
        label: '夏',
        colors: [
          { h: 50, s: 90, l: 65 },
          { h: 45, s: 85, l: 60 },
          { h: 200, s: 80, l: 65 },
          { h: 210, s: 75, l: 60 },
          { h: 100, s: 70, l: 55 },
          { h: 30, s: 90, l: 65 },
          { h: 330, s: 75, l: 70 }
        ]
      },
      autumn: {
        name: 'autumn',
        label: '秋',
        colors: [
          { h: 25, s: 85, l: 55 },
          { h: 15, s: 80, l: 50 },
          { h: 40, s: 75, l: 60 },
          { h: 0, s: 70, l: 45 },
          { h: 350, s: 65, l: 40 },
          { h: 50, s: 60, l: 55 },
          { h: 20, s: 70, l: 48 }
        ]
      },
      winter: {
        name: 'winter',
        label: '冬',
        colors: [
          { h: 210, s: 30, l: 85 },
          { h: 220, s: 25, l: 75 },
          { h: 200, s: 20, l: 90 },
          { h: 240, s: 15, l: 80 },
          { h: 0, s: 0, l: 85 },
          { h: 230, s: 35, l: 70 },
          { h: 190, s: 25, l: 78 }
        ]
      }
    };
  }

  getCurrentSeason(): Season {
    return this.currentSeason;
  }

  getCurrentSeasonLabel(): string {
    return this.palettes[this.currentSeason].label;
  }

  getIsTransitioning(): boolean {
    return this.isTransitioning;
  }

  getTransitionProgress(): number {
    return this.transitionProgress;
  }

  getCurrentPalette(): SeasonPalette {
    return this.palettes[this.currentSeason];
  }

  getHueRing(): HSLColor[] {
    const colors: HSLColor[] = [];
    for (let i = 0; i < 7; i++) {
      colors.push({ h: (i * 360) / 7, s: 70, l: 60 });
    }
    return colors;
  }

  getRandomColor(): HSLColor {
    const palette = this.palettes[this.currentSeason].colors;
    const idx = Math.floor(Math.random() * palette.length);
    return { ...palette[idx] };
  }

  getInterpolatedColor(): HSLColor {
    const currentColors = this.palettes[this.currentSeason].colors;
    const nextColors = this.palettes[this.nextSeason].colors;
    const idx = Math.floor(Math.random() * currentColors.length);
    const c1 = currentColors[idx];
    const c2 = nextColors[idx];
    const t = this.transitionProgress;
    return {
      h: this.lerpHue(c1.h, c2.h, t),
      s: this.lerp(c1.s, c2.s, t),
      l: this.lerp(c1.l, c2.l, t)
    };
  }

  startSeasonTransition(): void {
    if (this.isTransitioning) return;

    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    const currentIdx = seasons.indexOf(this.currentSeason);
    this.nextSeason = seasons[(currentIdx + 1) % 4];
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.transitionStartTime = performance.now();
  }

  update(): void {
    if (this.isTransitioning) {
      const elapsed = performance.now() - this.transitionStartTime;
      this.transitionProgress = Math.min(elapsed / this.transitionDuration, 1);

      if (this.transitionProgress >= 1) {
        this.currentSeason = this.nextSeason;
        this.isTransitioning = false;
        this.transitionProgress = 1;
      }
    }

    this.diffusionSources = this.diffusionSources.filter((s) => {
      s.strength *= 0.98;
      s.radius += 1.5;
      return s.strength > 0.01;
    });
  }

  addDiffusionSource(x: number, y: number, color: HSLColor): void {
    this.diffusionSources.push({
      x,
      y,
      radius: 10,
      color: { ...color },
      strength: 1
    });
  }

  getDiffusionEffect(x: number, y: number, baseColor: HSLColor): HSLColor {
    let result = { ...baseColor };
    for (const source of this.diffusionSources) {
      const dist = Math.sqrt((x - source.x) ** 2 + (y - source.y) ** 2);
      if (dist < source.radius) {
        const influence = (1 - dist / source.radius) * source.strength;
        result.h = this.lerpHue(result.h, source.color.h, influence * 0.5);
        result.s = this.lerp(result.s, source.color.s, influence * 0.5);
        result.l = this.lerp(result.l, source.color.l, influence * 0.5);
      }
    }
    return result;
  }

  shiftColorWarm(color: HSLColor): HSLColor {
    return {
      h: (color.h + 15 + 360) % 360,
      s: Math.min(color.s + 5, 100),
      l: Math.min(color.l + 20, 100)
    };
  }

  shiftColorCool(color: HSLColor): HSLColor {
    return {
      h: (color.h - 20 + 360) % 360,
      s: Math.max(color.s - 5, 0),
      l: Math.max(color.l - 10, 0)
    };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private lerpHue(a: number, b: number, t: number): number {
    let diff = b - a;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return (a + diff * t + 360) % 360;
  }

  static hslToString(color: HSLColor, alpha: number = 1): string {
    return `hsla(${color.h}, ${color.s}%, ${color.l}%, ${alpha})`;
  }
}
