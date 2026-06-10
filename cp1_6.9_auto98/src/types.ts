export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ThemeColors {
  keyStart: RGB;
  keyEnd: RGB;
  threadStart: RGB;
  threadEnd: RGB;
  pulseSaturation: number;
}

export const THEMES: Record<string, ThemeColors> = {
  starry: {
    keyStart: { r: 255, g: 136, b: 170 },
    keyEnd: { r: 136, g: 170, b: 255 },
    threadStart: { r: 204, g: 204, b: 221 },
    threadEnd: { r: 170, g: 136, b: 255 },
    pulseSaturation: 0.75
  },
  twilight: {
    keyStart: { r: 255, g: 170, b: 119 },
    keyEnd: { r: 187, g: 119, b: 255 },
    threadStart: { r: 221, g: 204, b: 204 },
    threadEnd: { r: 255, g: 153, b: 102 },
    pulseSaturation: 0.8
  },
  aurora: {
    keyStart: { r: 136, g: 255, b: 204 },
    keyEnd: { r: 170, g: 136, b: 255 },
    threadStart: { r: 204, g: 221, b: 221 },
    threadEnd: { r: 102, g: 255, b: 204 },
    pulseSaturation: 0.78
  },
  lava: {
    keyStart: { r: 255, g: 102, b: 102 },
    keyEnd: { r: 255, g: 204, b: 102 },
    threadStart: { r: 221, g: 204, b: 204 },
    threadEnd: { r: 255, g: 102, b: 51 },
    pulseSaturation: 0.85
  },
  deepsea: {
    keyStart: { r: 102, g: 204, b: 255 },
    keyEnd: { r: 102, g: 102, b: 255 },
    threadStart: { r: 204, g: 204, b: 221 },
    threadEnd: { r: 68, g: 136, b: 221 },
    pulseSaturation: 0.7
  }
};

export function lerpColor(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t)
  };
}

export function rgbToString(c: RGB, alpha = 1): string {
  return `rgba(${c.r},${c.g},${c.b},${alpha})`;
}

export function mixColors(a: RGB, b: RGB, ratio = 0.5): RGB {
  return lerpColor(a, b, ratio);
}
