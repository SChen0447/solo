export const SAND_COLORS: string[] = [
  '#ff6677',
  '#ffbb66',
  '#66ff77',
  '#66ccff',
  '#cc66ff'
];

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' +
    clamp(r).toString(16).padStart(2, '0') +
    clamp(g).toString(16).padStart(2, '0') +
    clamp(b).toString(16).padStart(2, '0');
}

export function randomSandColor(): string {
  return SAND_COLORS[Math.floor(Math.random() * SAND_COLORS.length)];
}

export function mixColors(colors: { color: string; weight: number }[]): string {
  if (colors.length === 0) return '#ffffff';
  let totalWeight = 0;
  let r = 0, g = 0, b = 0;
  for (const item of colors) {
    const rgb = hexToRgb(item.color);
    r += rgb.r * item.weight;
    g += rgb.g * item.weight;
    b += rgb.b * item.weight;
    totalWeight += item.weight;
  }
  if (totalWeight === 0) return colors[0].color;
  return rgbToHex(r / totalWeight, g / totalWeight, b / totalWeight);
}

export function lerpColor(color1: string, color2: string, t: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  return rgbToHex(
    rgb1.r + (rgb2.r - rgb1.r) * t,
    rgb1.g + (rgb2.g - rgb1.g) * t,
    rgb1.b + (rgb2.b - rgb1.b) * t
  );
}
