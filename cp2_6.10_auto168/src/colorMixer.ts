export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Color extends RGB {
  alpha: number;
  hex: string;
  hsl: HSL;
}

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light';

export function hslToRgb(h: number, s: number, l: number): RGB {
  h = h / 360;
  s = s / 100;
  l = l / 100;

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

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  r = r / 255;
  g = g / 255;
  b = b / 255;

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
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export function normalizeColor(hsl: HSL, alpha: number): Color {
  const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return {
    ...rgb,
    alpha,
    hex: rgbToHex(rgb.r, rgb.g, rgb.b),
    hsl: { ...hsl },
  };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, n));
}

function blendNormal(cb: number, cs: number): number {
  return cs;
}

function blendMultiply(cb: number, cs: number): number {
  return (cb * cs) / 255;
}

function blendScreen(cb: number, cs: number): number {
  return 255 - ((255 - cb) * (255 - cs)) / 255;
}

function blendOverlay(cb: number, cs: number): number {
  return cb < 127.5
    ? (2 * cb * cs) / 255
    : 255 - (2 * (255 - cb) * (255 - cs)) / 255;
}

function blendSoftLight(cb: number, cs: number): number {
  const b = cb / 255;
  const s = cs / 255;
  let result: number;
  if (s <= 0.5) {
    result = b - (1 - 2 * s) * b * (1 - b);
  } else {
    const dv =
      b <= 0.25
        ? ((16 * b - 12) * b + 4) * b
        : Math.sqrt(b);
    result = b + (2 * s - 1) * (dv - b);
  }
  return result * 255;
}

function getBlendFunc(mode: BlendMode): (cb: number, cs: number) => number {
  switch (mode) {
    case 'normal':
      return blendNormal;
    case 'multiply':
      return blendMultiply;
    case 'screen':
      return blendScreen;
    case 'overlay':
      return blendOverlay;
    case 'soft-light':
      return blendSoftLight;
    default:
      return blendNormal;
  }
}

export function mixColors(
  c1: Color,
  c2: Color,
  mode: BlendMode,
  alpha1: number,
  alpha2: number
): Color {
  const blendFn = getBlendFunc(mode);

  const rBlend = blendFn(c1.r, c2.r);
  const gBlend = blendFn(c1.g, c2.g);
  const bBlend = blendFn(c1.b, c2.b);

  const a1 = alpha1;
  const a2 = alpha2;
  const outAlpha = a2 + a1 * (1 - a2);

  let rOut: number, gOut: number, bOut: number;

  if (outAlpha === 0) {
    rOut = gOut = bOut = 0;
  } else {
    if (mode === 'normal') {
      rOut = (c2.r * a2 + c1.r * a1 * (1 - a2)) / outAlpha;
      gOut = (c2.g * a2 + c1.g * a1 * (1 - a2)) / outAlpha;
      bOut = (c2.b * a2 + c1.b * a1 * (1 - a2)) / outAlpha;
    } else {
      rOut = (rBlend * a2 + c1.r * a1 * (1 - a2)) / outAlpha;
      gOut = (gBlend * a2 + c1.g * a1 * (1 - a2)) / outAlpha;
      bOut = (bBlend * a2 + c1.b * a1 * (1 - a2)) / outAlpha;
    }
  }

  const r = clamp(rOut);
  const g = clamp(gOut);
  const b = clamp(bOut);

  return {
    r,
    g,
    b,
    alpha: outAlpha,
    hex: rgbToHex(r, g, b),
    hsl: rgbToHsl(r, g, b),
  };
}
