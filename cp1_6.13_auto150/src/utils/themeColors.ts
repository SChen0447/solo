export interface ThemeColor {
  r: number;
  g: number;
  b: number;
}

export interface ColorTheme {
  name: string;
  label: string;
  colors: ThemeColor[];
}

export const THEMES: ColorTheme[] = [
  {
    name: 'neon',
    label: '霓虹',
    colors: [
      { r: 0, g: 255, b: 255 },
      { r: 255, g: 0, b: 255 },
      { r: 255, g: 255, b: 0 },
    ],
  },
  {
    name: 'aurora',
    label: '极光',
    colors: [
      { r: 0, g: 255, b: 128 },
      { r: 100, g: 100, b: 255 },
      { r: 0, g: 200, b: 255 },
    ],
  },
  {
    name: 'ink',
    label: '水墨',
    colors: [
      { r: 200, g: 200, b: 200 },
      { r: 160, g: 160, b: 170 },
      { r: 120, g: 120, b: 130 },
    ],
  },
];

export function getParticleColor(
  theme: ColorTheme,
  particleIndex: number,
  totalParticles: number
): ThemeColor {
  const segLen = totalParticles / theme.colors.length;
  const segIdx = Math.min(
    Math.floor(particleIndex / segLen),
    theme.colors.length - 1
  );
  const nextIdx = (segIdx + 1) % theme.colors.length;
  const t = (particleIndex - segIdx * segLen) / segLen;

  return {
    r: Math.round(theme.colors[segIdx].r + (theme.colors[nextIdx].r - theme.colors[segIdx].r) * t),
    g: Math.round(theme.colors[segIdx].g + (theme.colors[nextIdx].g - theme.colors[segIdx].g) * t),
    b: Math.round(theme.colors[segIdx].b + (theme.colors[nextIdx].b - theme.colors[segIdx].b) * t),
  };
}

export function lerpColor(a: ThemeColor, b: ThemeColor, t: number): ThemeColor {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}
