export interface EasingPreset {
  id: string;
  name: string;
  category: 'preset' | 'custom';
  cssValue: string;
  bezier: [number, number, number, number];
}

export const easingPresets: EasingPreset[] = [
  {
    id: 'linear',
    name: 'linear',
    category: 'preset',
    cssValue: 'linear',
    bezier: [0, 0, 1, 1],
  },
  {
    id: 'ease',
    name: 'ease',
    category: 'preset',
    cssValue: 'ease',
    bezier: [0.25, 0.1, 0.25, 1.0],
  },
  {
    id: 'ease-in',
    name: 'ease-in',
    category: 'preset',
    cssValue: 'ease-in',
    bezier: [0.42, 0, 1, 1],
  },
  {
    id: 'ease-out',
    name: 'ease-out',
    category: 'preset',
    cssValue: 'ease-out',
    bezier: [0, 0, 0.58, 1],
  },
  {
    id: 'ease-in-out',
    name: 'ease-in-out',
    category: 'preset',
    cssValue: 'ease-in-out',
    bezier: [0.42, 0, 0.58, 1],
  },
  {
    id: 'ease-in-sine',
    name: 'easeInSine',
    category: 'preset',
    cssValue: 'cubic-bezier(0.12, 0, 0.39, 0)',
    bezier: [0.12, 0, 0.39, 0],
  },
  {
    id: 'ease-out-sine',
    name: 'easeOutSine',
    category: 'preset',
    cssValue: 'cubic-bezier(0.61, 1, 0.88, 1)',
    bezier: [0.61, 1, 0.88, 1],
  },
  {
    id: 'ease-in-out-sine',
    name: 'easeInOutSine',
    category: 'preset',
    cssValue: 'cubic-bezier(0.37, 0, 0.63, 1)',
    bezier: [0.37, 0, 0.63, 1],
  },
  {
    id: 'ease-in-quad',
    name: 'easeInQuad',
    category: 'preset',
    cssValue: 'cubic-bezier(0.11, 0, 0.5, 0)',
    bezier: [0.11, 0, 0.5, 0],
  },
  {
    id: 'ease-out-quad',
    name: 'easeOutQuad',
    category: 'preset',
    cssValue: 'cubic-bezier(0.5, 1, 0.89, 1)',
    bezier: [0.5, 1, 0.89, 1],
  },
  {
    id: 'ease-in-out-quad',
    name: 'easeInOutQuad',
    category: 'preset',
    cssValue: 'cubic-bezier(0.45, 0, 0.55, 1)',
    bezier: [0.45, 0, 0.55, 1],
  },
  {
    id: 'ease-in-cubic',
    name: 'easeInCubic',
    category: 'preset',
    cssValue: 'cubic-bezier(0.32, 0, 0.67, 0)',
    bezier: [0.32, 0, 0.67, 0],
  },
  {
    id: 'ease-out-cubic',
    name: 'easeOutCubic',
    category: 'preset',
    cssValue: 'cubic-bezier(0.33, 1, 0.68, 1)',
    bezier: [0.33, 1, 0.68, 1],
  },
  {
    id: 'ease-in-out-cubic',
    name: 'easeInOutCubic',
    category: 'preset',
    cssValue: 'cubic-bezier(0.65, 0, 0.35, 1)',
    bezier: [0.65, 0, 0.35, 1],
  },
  {
    id: 'ease-in-quart',
    name: 'easeInQuart',
    category: 'preset',
    cssValue: 'cubic-bezier(0.5, 0, 0.75, 0)',
    bezier: [0.5, 0, 0.75, 0],
  },
  {
    id: 'ease-out-quart',
    name: 'easeOutQuart',
    category: 'preset',
    cssValue: 'cubic-bezier(0.25, 1, 0.5, 1)',
    bezier: [0.25, 1, 0.5, 1],
  },
  {
    id: 'ease-in-out-quart',
    name: 'easeInOutQuart',
    category: 'preset',
    cssValue: 'cubic-bezier(0.76, 0, 0.24, 1)',
    bezier: [0.76, 0, 0.24, 1],
  },
  {
    id: 'ease-in-quint',
    name: 'easeInQuint',
    category: 'preset',
    cssValue: 'cubic-bezier(0.64, 0, 0.78, 0)',
    bezier: [0.64, 0, 0.78, 0],
  },
  {
    id: 'ease-out-quint',
    name: 'easeOutQuint',
    category: 'preset',
    cssValue: 'cubic-bezier(0.22, 1, 0.36, 1)',
    bezier: [0.22, 1, 0.36, 1],
  },
  {
    id: 'ease-in-out-quint',
    name: 'easeInOutQuint',
    category: 'preset',
    cssValue: 'cubic-bezier(0.83, 0, 0.17, 1)',
    bezier: [0.83, 0, 0.17, 1],
  },
  {
    id: 'ease-in-expo',
    name: 'easeInExpo',
    category: 'preset',
    cssValue: 'cubic-bezier(0.7, 0, 0.84, 0)',
    bezier: [0.7, 0, 0.84, 0],
  },
  {
    id: 'ease-out-expo',
    name: 'easeOutExpo',
    category: 'preset',
    cssValue: 'cubic-bezier(0.16, 1, 0.3, 1)',
    bezier: [0.16, 1, 0.3, 1],
  },
  {
    id: 'ease-in-out-expo',
    name: 'easeInOutExpo',
    category: 'preset',
    cssValue: 'cubic-bezier(0.87, 0, 0.13, 1)',
    bezier: [0.87, 0, 0.13, 1],
  },
  {
    id: 'ease-in-circ',
    name: 'easeInCirc',
    category: 'preset',
    cssValue: 'cubic-bezier(0.55, 0, 1, 0.45)',
    bezier: [0.55, 0, 1, 0.45],
  },
  {
    id: 'ease-out-circ',
    name: 'easeOutCirc',
    category: 'preset',
    cssValue: 'cubic-bezier(0, 0.55, 0.45, 1)',
    bezier: [0, 0.55, 0.45, 1],
  },
  {
    id: 'ease-in-out-circ',
    name: 'easeInOutCirc',
    category: 'preset',
    cssValue: 'cubic-bezier(0.85, 0, 0.15, 1)',
    bezier: [0.85, 0, 0.15, 1],
  },
  {
    id: 'ease-in-back',
    name: 'easeInBack',
    category: 'preset',
    cssValue: 'cubic-bezier(0.36, 0, 0.66, -0.56)',
    bezier: [0.36, 0, 0.66, -0.56],
  },
  {
    id: 'ease-out-back',
    name: 'easeOutBack',
    category: 'preset',
    cssValue: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    bezier: [0.34, 1.56, 0.64, 1],
  },
  {
    id: 'ease-in-out-back',
    name: 'easeInOutBack',
    category: 'preset',
    cssValue: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
    bezier: [0.68, -0.6, 0.32, 1.6],
  },
  {
    id: 'custom-smooth',
    name: 'customSmooth',
    category: 'custom',
    cssValue: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    bezier: [0.25, 0.46, 0.45, 0.94],
  },
  {
    id: 'custom-snap',
    name: 'customSnap',
    category: 'custom',
    cssValue: 'cubic-bezier(0.6, -0.28, 0.735, 0.045)',
    bezier: [0.6, -0.28, 0.735, 0.045],
  },
  {
    id: 'custom-bounce',
    name: 'customBounce',
    category: 'custom',
    cssValue: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    bezier: [0.68, -0.55, 0.265, 1.55],
  },
];

export function cubicBezier(
  t: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const solveCurveX = (x: number): number => {
    let t2 = x;
    for (let i = 0; i < 8; i++) {
      const x2 = ((ax * t2 + bx) * t2 + cx) * t2 - x;
      if (Math.abs(x2) < 1e-6) return t2;
      const d2 = (3 * ax * t2 + 2 * bx) * t2 + cx;
      if (Math.abs(d2) < 1e-6) break;
      t2 -= x2 / d2;
    }
    const t0 = 0;
    const t1 = 1;
    t2 = x;
    if (t2 < t0) return t0;
    if (t2 > t1) return t1;
    while (t0 < t1) {
      const x2 = ((ax * t2 + bx) * t2 + cx) * t2;
      if (Math.abs(x2 - x) < 1e-6) break;
      if (x > x2) t0 = t2;
      else t1 = t2;
      t2 = (t1 - t0) / 2 + t0;
    }
    return t2;
  };

  const tPrime = solveCurveX(t);
  return ((ay * tPrime + by) * tPrime + cy) * tPrime;
}

export function bezierToCss(bezier: [number, number, number, number]): string {
  const [x1, y1, x2, y2] = bezier;
  return `cubic-bezier(${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)})`;
}
