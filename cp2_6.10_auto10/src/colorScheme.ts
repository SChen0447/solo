export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export type SchemeType = 'analogous' | 'complementary' | 'triadic' | 'monochromatic' | 'custom';

export interface ColorScheme {
  name: string;
  type: SchemeType;
  colors: HSLColor[];
}

export interface FavoriteItem {
  id: string;
  baseColor: HSLColor;
  schemes: ColorScheme[];
  createdAt: number;
}

export function hslToString(color: HSLColor): string {
  return `hsl(${Math.round(color.h)}, ${Math.round(color.s)}%, ${Math.round(color.l)}%)`;
}

export function hslToHex(color: HSLColor): string {
  const h = color.h / 360;
  const s = color.s / 100;
  const l = color.l / 100;

  let r: number, g: number, b: number;

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

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function hexToHsl(hex: string): HSLColor {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

function generateAnalogous(base: HSLColor): HSLColor[] {
  return [
    { h: normalizeHue(base.h - 30), s: base.s, l: base.l },
    { h: normalizeHue(base.h - 15), s: base.s, l: base.l },
    { ...base },
    { h: normalizeHue(base.h + 15), s: base.s, l: base.l },
    { h: normalizeHue(base.h + 30), s: base.s, l: base.l }
  ];
}

function generateComplementary(base: HSLColor): HSLColor[] {
  const comp = { h: normalizeHue(base.h + 180), s: base.s, l: base.l };
  return [
    { h: base.h, s: base.s, l: Math.min(95, base.l + 20) },
    { ...base },
    { h: base.h, s: Math.max(10, base.s - 20), l: Math.max(10, base.l - 15) },
    { ...comp },
    { h: comp.h, s: comp.s, l: Math.min(95, comp.l + 20) }
  ];
}

function generateTriadic(base: HSLColor): HSLColor[] {
  return [
    { ...base },
    { h: normalizeHue(base.h + 15), s: Math.max(30, base.s - 20), l: Math.min(90, base.l + 15) },
    { h: normalizeHue(base.h + 120), s: base.s, l: base.l },
    { h: normalizeHue(base.h + 240), s: base.s, l: base.l },
    { h: normalizeHue(base.h + 255), s: Math.max(30, base.s - 20), l: Math.min(90, base.l + 15) }
  ];
}

function generateMonochromatic(base: HSLColor): HSLColor[] {
  return [
    { h: base.h, s: Math.max(10, base.s - 10), l: 90 },
    { h: base.h, s: base.s, l: Math.min(85, base.l + 20) },
    { ...base },
    { h: base.h, s: base.s, l: Math.max(20, base.l - 20) },
    { h: base.h, s: Math.max(20, base.s - 15), l: Math.max(10, base.l - 35) }
  ];
}

function generateCustom(base: HSLColor): HSLColor[] {
  return [
    { h: normalizeHue(base.h - 150), s: base.s, l: base.l },
    { h: normalizeHue(base.h - 30), s: base.s, l: Math.min(85, base.l + 15) },
    { ...base },
    { h: normalizeHue(base.h + 30), s: base.s, l: Math.max(25, base.l - 15) },
    { h: normalizeHue(base.h + 150), s: base.s, l: base.l }
  ];
}

export function generateSchemes(baseColor: HSLColor): ColorScheme[] {
  return [
    { name: '类比色', type: 'analogous', colors: generateAnalogous(baseColor) },
    { name: '互补色', type: 'complementary', colors: generateComplementary(baseColor) },
    { name: '三角色', type: 'triadic', colors: generateTriadic(baseColor) },
    { name: '单色', type: 'monochromatic', colors: generateMonochromatic(baseColor) },
    { name: '分裂互补', type: 'custom', colors: generateCustom(baseColor) }
  ];
}

export function generateCssVariables(scheme: ColorScheme): string {
  const lines = [':root {'];
  scheme.colors.forEach((color, index) => {
    lines.push(`  --color-${index + 1}: ${hslToHex(color)};`);
    lines.push(`  --color-${index + 1}-hsl: ${hslToString(color)};`);
  });
  lines.push('}');
  return lines.join('\n');
}
