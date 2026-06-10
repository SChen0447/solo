export type ThemeName = 'neon' | 'ocean' | 'fire' | 'aurora';
export type AnimationMode = 'bars' | 'pulse' | 'glow' | 'particles';

export interface ThemeColors {
  startColor: string;
  endColor: string;
  waveColor: string;
  name: string;
}

export class ThemeController {
  currentTheme: ThemeName;
  currentAnimation: AnimationMode;
  themes: Record<ThemeName, ThemeColors>;

  constructor() {
    this.currentTheme = 'neon';
    this.currentAnimation = 'bars';
    this.themes = {
      neon: {
        startColor: '#00BFFF',
        endColor: '#FF1493',
        waveColor: '#00FFFF',
        name: '霓虹幻彩'
      },
      ocean: {
        startColor: '#00CED1',
        endColor: '#1E90FF',
        waveColor: '#4169E1',
        name: '海洋迷雾'
      },
      fire: {
        startColor: '#FF4500',
        endColor: '#FF0000',
        waveColor: '#FF6347',
        name: '火焰熔岩'
      },
      aurora: {
        startColor: '#00FF7F',
        endColor: '#9370DB',
        waveColor: '#7FFFD4',
        name: '极光星云'
      }
    };
  }

  setTheme(name: ThemeName): void {
    if (this.themes[name]) {
      this.currentTheme = name;
    }
  }

  setAnimationMode(mode: AnimationMode): void {
    this.currentAnimation = mode;
  }

  getGradientColors(): { start: string; end: string } {
    const theme = this.themes[this.currentTheme];
    return { start: theme.startColor, end: theme.endColor };
  }

  getWaveColor(): string {
    return this.themes[this.currentTheme].waveColor;
  }

  getAnimationMode(): AnimationMode {
    return this.currentAnimation;
  }

  hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 0, g: 191, b: 255 };
  }

  interpolateColor(t: number): string {
    const { start, end } = this.getGradientColors();
    const s = this.hexToRgb(start);
    const e = this.hexToRgb(end);
    const r = Math.round(s.r + (e.r - s.r) * t);
    const g = Math.round(s.g + (e.g - s.g) * t);
    const b = Math.round(s.b + (e.b - s.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
}
