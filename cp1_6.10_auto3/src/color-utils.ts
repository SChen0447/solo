export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RgbColor | null {
  const clean = hex.replace(/^#/, '').trim();
  let full = '';

  if (clean.length === 3) {
    full = clean.split('').map((c) => c + c).join('');
  } else if (clean.length === 6) {
    full = clean;
  } else if (clean.length === 8) {
    full = clean.slice(0, 6);
  } else {
    return null;
  }

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    return null;
  }

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16)
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function parseRgbString(input: string): RgbColor | null {
  const match = input.match(
    /rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/i
  );
  if (!match) return null;

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);

  if (r > 255 || g > 255 || b > 255) return null;
  return { r, g, b };
}

export function parseColor(input: string): RgbColor | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('#')) {
    return hexToRgb(trimmed);
  }

  if (/^rgb/i.test(trimmed)) {
    return parseRgbString(trimmed);
  }

  return hexToRgb(trimmed);
}

export function deltaE(color1: RgbColor, color2: RgbColor): number {
  const dr = color1.r - color2.r;
  const dg = color1.g - color2.g;
  const db = color1.b - color2.b;
  const distance = Math.sqrt(dr * dr + dg * dg + db * db);
  const maxDistance = Math.sqrt(255 * 255 * 3);
  return Math.round((distance / maxDistance) * 100);
}

export function deltaEColor(value: number): string {
  const clamped = Math.max(0, Math.min(100, value));
  const t = clamped / 100;
  const r = Math.round(76 + (220 - 76) * t);
  const g = Math.round(175 + (80 - 175) * t);
  const b = Math.round(80 + (80 - 80) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function deltaEGradient(value: number): string {
  const clamped = Math.max(0, Math.min(100, value));
  const t = clamped / 100;
  const r = Math.round(76 + (220 - 76) * t);
  const g = Math.round(175 + (80 - 175) * t);
  const b = 80;
  return `linear-gradient(90deg, rgb(76, 175, 80), rgb(${r}, ${g}, ${b}))`;
}
