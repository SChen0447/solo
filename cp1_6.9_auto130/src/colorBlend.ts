export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface HSLA {
  h: number;
  s: number;
  l: number;
  a: number;
}

export function hexToRgb(hex: string): RGBA {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: 1
      }
    : { r: 0, g: 0, b: 0, a: 1 };
}

export function rgbToHex(rgb: RGBA): string {
  const toHex = (n: number) => {
    const v = Math.max(0, Math.min(255, Math.round(n)));
    return v.toString(16).padStart(2, '0');
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function rgbToHsl(rgb: RGBA): HSLA {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

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

  return {
    h: h * 360,
    s: s * 100,
    l: l * 100,
    a: rgb.a
  };
}

export function hslToRgb(hsl: HSLA): RGBA {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r: number;
  let g: number;
  let b: number;

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

  return {
    r: r * 255,
    g: g * 255,
    b: b * 255,
    a: hsl.a
  };
}

export function shiftHue(hex: string, degrees: number): string {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  hsl.h = (hsl.h + degrees) % 360;
  if (hsl.h < 0) hsl.h += 360;
  const result = hslToRgb(hsl);
  return rgbToHex(result);
}

export function blendColors(colors: string[], alphas: number[]): { hex: string; alpha: number } {
  if (colors.length === 0) {
    return { hex: '#ffffff', alpha: 1 };
  }

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let aSum = 0;

  for (let i = 0; i < colors.length; i++) {
    const rgb = hexToRgb(colors[i]);
    const a = alphas[i] ?? 1;
    rSum += rgb.r * a;
    gSum += rgb.g * a;
    bSum += rgb.b * a;
    aSum += a;
  }

  const count = aSum > 0 ? aSum : colors.length;
  const avgRgb: RGBA = {
    r: rSum / count,
    g: gSum / count,
    b: bSum / count,
    a: Math.min(1, aSum / colors.length)
  };

  const hsl = rgbToHsl(avgRgb);
  hsl.s = Math.min(100, hsl.s + 20);

  const blendedRgb = hslToRgb(hsl);
  return {
    hex: rgbToHex(blendedRgb),
    alpha: avgRgb.a
  };
}
