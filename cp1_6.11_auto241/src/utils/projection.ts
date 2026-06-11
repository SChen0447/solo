export interface LightParams {
  altitude: number;
  azimuth: number;
}

export interface ProjectionSpot {
  id: string;
  x: number;
  y: number;
  color: string;
  opacity: number;
  blur: number;
}

export const GLASS_COLORS: string[] = [
  '#C41E3A',
  '#1E3A8A',
  '#059669',
  '#D97706',
  '#7C3AED',
  '#DC2626',
  '#0891B2',
  '#65A30D',
  '#EA580C',
  '#9333EA',
  '#0284C7',
  '#BE123C',
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
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

  return { h, s, l };
}

function hslToRgb(
  h: number,
  s: number,
  l: number
): { r: number; g: number; b: number } {
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

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export function desaturateColor(hex: string, reduction: number = 0.4): string {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const newS = Math.max(0, s * (1 - reduction));
  const { r: nr, g: ng, b: nb } = hslToRgb(h, newS, l);
  return rgbToHex(nr, ng, nb);
}

export function getSectionCenter(index: number, radius: number = 200): {
  cx: number;
  cy: number;
} {
  const angleStep = (2 * Math.PI) / 12;
  const startAngle = -Math.PI / 2 - angleStep / 2;
  const angle = startAngle + (index + 0.5) * angleStep;
  const dist = radius * 0.65;
  return {
    cx: 300 + dist * Math.cos(angle),
    cy: 300 + dist * Math.sin(angle),
  };
}

export function computeProjections(
  sections: { id: string; index: number; color: string | null }[],
  light: LightParams
): ProjectionSpot[] {
  const { altitude, azimuth } = light;

  const altRad = (altitude * Math.PI) / 180;
  const azRad = (azimuth * Math.PI) / 180;

  const projectionScale = (1 - Math.sin(altRad)) * 180 + 20;
  const offsetX = Math.cos(azRad) * projectionScale;
  const offsetY = Math.sin(azRad) * projectionScale;

  const blurRadius = (1 - Math.sin(altRad)) * 25 + 8;
  const baseOpacity = 0.15 + Math.sin(altRad) * 0.45;

  return sections
    .filter((s) => s.color !== null)
    .map((section) => {
      const { cx, cy } = getSectionCenter(section.index, 200);
      return {
        id: section.id,
        x: cx + offsetX,
        y: cy + offsetY,
        color: desaturateColor(section.color as string, 0.4),
        opacity: baseOpacity,
        blur: blurRadius,
      };
    });
}

export function generatePetalPath(index: number): string {
  const cx = 300;
  const cy = 300;
  const outerR = 280;
  const innerR = 60;
  const angleStep = (2 * Math.PI) / 12;
  const startAngle = -Math.PI / 2 - angleStep / 2 + index * angleStep;
  const endAngle = startAngle + angleStep;

  const midAngle = startAngle + angleStep / 2;
  const midR = (outerR + innerR) / 2;
  const cpOut = outerR * 0.95;
  const cpIn = innerR * 1.25;

  const x1 = cx + innerR * Math.cos(startAngle);
  const y1 = cy + innerR * Math.sin(startAngle);
  const x2 = cx + outerR * Math.cos(startAngle);
  const y2 = cy + outerR * Math.sin(startAngle);
  const x3 = cx + outerR * Math.cos(endAngle);
  const y3 = cy + outerR * Math.sin(endAngle);
  const x4 = cx + innerR * Math.cos(endAngle);
  const y4 = cy + innerR * Math.sin(endAngle);

  const cpOut1x = cx + cpOut * Math.cos(startAngle + angleStep * 0.25);
  const cpOut1y = cy + cpOut * Math.sin(startAngle + angleStep * 0.25);
  const cpOut2x = cx + cpOut * Math.cos(endAngle - angleStep * 0.25);
  const cpOut2y = cy + cpOut * Math.sin(endAngle - angleStep * 0.25);

  const cpIn1x = cx + cpIn * Math.cos(endAngle - angleStep * 0.25);
  const cpIn1y = cy + cpIn * Math.sin(endAngle - angleStep * 0.25);
  const cpIn2x = cx + cpIn * Math.cos(startAngle + angleStep * 0.25);
  const cpIn2y = cy + cpIn * Math.sin(startAngle + angleStep * 0.25);

  const midX = cx + midR * Math.cos(midAngle);
  const midY = cy + midR * Math.sin(midAngle);

  return `
    M ${x1} ${y1}
    Q ${cpOut1x} ${cpOut1y} ${(x2 + midX) / 2} ${(y2 + midY) / 2}
    T ${x3} ${y3}
    L ${x4} ${y4}
    Q ${cpIn1x} ${cpIn1y} ${(x4 + midX) / 2} ${(y4 + midY) / 2}
    T ${x1} ${y1}
    Z
  `;
}
