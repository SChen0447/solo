export type ThemeId = 'aurora' | 'lava' | 'ocean' | 'nebula';

export interface ColorTheme {
  id: ThemeId;
  name: string;
  gradient: [string, string];
  backgroundGradient: string;
  colors: string[];
}

export const THEMES: Record<ThemeId, ColorTheme> = {
  aurora: {
    id: 'aurora',
    name: '极光幻彩',
    gradient: ['#00ff87', '#60efff'],
    backgroundGradient: 'radial-gradient(ellipse at center, #0a3d2e 0%, #04160f 50%, #061a12 100%)',
    colors: ['#00ff87', '#60efff', '#00d4aa', '#5effc8', '#8affe0']
  },
  lava: {
    id: 'lava',
    name: '熔岩炙热',
    gradient: ['#ff4e50', '#f9d423'],
    backgroundGradient: 'radial-gradient(ellipse at center, #3d1a0a 0%, #1a0a04 50%, #1f0d05 100%)',
    colors: ['#ff4e50', '#f9d423', '#ff6b35', '#ff9f1c', '#ffd166']
  },
  ocean: {
    id: 'ocean',
    name: '深海幽蓝',
    gradient: ['#0077b6', '#90e0ef'],
    backgroundGradient: 'radial-gradient(ellipse at center, #0a1e3d 0%, #040e1f 50%, #06132a 100%)',
    colors: ['#0077b6', '#90e0ef', '#00b4d8', '#48cae4', '#ade8f4']
  },
  nebula: {
    id: 'nebula',
    name: '星云紫晶',
    gradient: ['#8e44ad', '#3498db'],
    backgroundGradient: 'radial-gradient(ellipse at center, #302b63 0%, #0f0c29 50%, #24243e 100%)',
    colors: ['#8e44ad', '#3498db', '#a855f7', '#6366f1', '#06b6d4']
  }
};

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}

export function getGradientColor(
  themeId: ThemeId,
  t: number
): string {
  const theme = THEMES[themeId];
  const [startHex, endHex] = theme.gradient;
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);
  const r = Math.round(start.r + (end.r - start.r) * t);
  const g = Math.round(start.g + (end.g - start.g) * t);
  const b = Math.round(start.b + (end.b - start.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function getRandomColor(themeId: ThemeId): string {
  const theme = THEMES[themeId];
  return theme.colors[Math.floor(Math.random() * theme.colors.length)];
}

export function getBackgroundGradient(themeId: ThemeId): string {
  return THEMES[themeId].backgroundGradient;
}
