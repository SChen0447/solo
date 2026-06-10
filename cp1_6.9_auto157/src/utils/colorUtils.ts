export function hexToHsl(hex: string): { h: number; s: number; l: number } {
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

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

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

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function generateColorRing(hex: string): string[] {
  const { h, s, l } = hexToHsl(hex);
  const colors: string[] = [];
  const hOffsets = [-15, -10, -5, 0, 5, 10, 15];
  const sOffsets = [-10, -5, 0, 5, 10];
  const lOffsets = [-20, -10, 0, 10, 20];

  for (let i = 0; i < 12; i++) {
    const newH = (h + hOffsets[i % hOffsets.length] + 360) % 360;
    const newS = Math.max(0, Math.min(100, s + sOffsets[i % sOffsets.length]));
    const newL = Math.max(0, Math.min(100, l + lOffsets[i % lOffsets.length]));
    colors.push(hslToHex(newH, newS, newL));
  }
  return colors;
}

export function darkenColor(hex: string, percent: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, l - percent));
}

export function getColorFamily(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  if (s < 15 || l > 85) return 'gray';
  if (h < 15 || h >= 345) return 'red';
  if (h >= 15 && h < 45) return 'orange';
  if (h >= 45 && h < 75) return 'yellow';
  if (h >= 75 && h < 165) return 'green';
  if (h >= 165 && h < 255) return 'blue';
  if (h >= 255 && h < 285) return 'purple';
  return 'brown';
}

export const COLOR_FAMILY_LABELS: Record<string, string> = {
  all: '全部',
  red: '红',
  orange: '橙',
  yellow: '黄',
  green: '绿',
  blue: '蓝',
  purple: '紫',
  brown: '棕',
  gray: '灰',
};
