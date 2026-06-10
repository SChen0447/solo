import { EasingType } from './types';

export function getEasingValue(
  type: EasingType,
  t: number,
  cubicBezierParams?: string,
  stepsParams?: string
): number {
  switch (type) {
    case 'ease':
      return cubicBezier(0.25, 0.1, 0.25, 1, t);
    case 'ease-in':
      return cubicBezier(0.42, 0, 1, 1, t);
    case 'ease-out':
      return cubicBezier(0, 0, 0.58, 1, t);
    case 'ease-in-out':
      return cubicBezier(0.42, 0, 0.58, 1, t);
    case 'cubic-bezier': {
      const params = parseCubicBezierParams(cubicBezierParams);
      return cubicBezier(params[0], params[1], params[2], params[3], t);
    }
    case 'steps': {
      const params = parseStepsParams(stepsParams);
      return steps(params[0], params[1], t);
    }
    default:
      return t;
  }
}

function parseCubicBezierParams(params?: string): [number, number, number, number] {
  if (!params) return [0.42, 0, 0.58, 1];
  const parts = params.split(',').map((s) => parseFloat(s.trim()));
  if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
    return [parts[0], parts[1], parts[2], parts[3]];
  }
  return [0.42, 0, 0.58, 1];
}

function parseStepsParams(params?: string): [number, 'start' | 'end'] {
  if (!params) return [4, 'end'];
  const parts = params.split(',').map((s) => s.trim());
  const n = parseInt(parts[0], 10);
  const pos = (parts[1] === 'start' ? 'start' : 'end') as 'start' | 'end';
  if (!isNaN(n) && n > 0) {
    return [n, pos];
  }
  return [4, 'end'];
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  function sampleCurveX(t: number): number {
    return ((ax * t + bx) * t + cx) * t;
  }

  function sampleCurveY(t: number): number {
    return ((ay * t + by) * t + cy) * t;
  }

  function sampleCurveDerivativeX(t: number): number {
    return (3 * ax * t + 2 * bx) * t + cx;
  }

  function solveCurveX(x: number): number {
    let t2 = x;
    let x2 = 0;
    let d2 = 0;
    for (let i = 0; i < 8; i++) {
      x2 = sampleCurveX(t2) - x;
      if (Math.abs(x2) < 1e-6) return t2;
      d2 = sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < 1e-6) break;
      t2 = t2 - x2 / d2;
    }
    let t0 = 0;
    let t1 = 1;
    t2 = x;
    if (t2 < t0) return t0;
    if (t2 > t1) return t1;
    while (t0 < t1) {
      x2 = sampleCurveX(t2);
      if (Math.abs(x2 - x) < 1e-6) return t2;
      if (x > x2) t0 = t2;
      else t1 = t2;
      t2 = (t1 - t0) * 0.5 + t0;
    }
    return t2;
  }

  return sampleCurveY(solveCurveX(t));
}

function steps(n: number, position: 'start' | 'end', t: number): number {
  if (position === 'start') {
    return Math.min(1, Math.floor(t * n) / n + 1 / n);
  }
  return Math.min(1, Math.floor(t * n) / n);
}

export function getEasingCSSValue(
  type: EasingType,
  cubicBezierParams?: string,
  stepsParams?: string
): string {
  switch (type) {
    case 'ease':
    case 'ease-in':
    case 'ease-out':
    case 'ease-in-out':
      return type;
    case 'cubic-bezier':
      return `cubic-bezier(${cubicBezierParams || '0.42, 0, 0.58, 1'})`;
    case 'steps':
      return `steps(${stepsParams || '4, end'})`;
    default:
      return 'ease';
  }
}

export function generateEasingCurvePoints(
  type: EasingType,
  width: number,
  height: number,
  cubicBezierParams?: string,
  stepsParams?: string
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const steps = width;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const value = getEasingValue(type, t, cubicBezierParams, stepsParams);
    points.push({
      x: t * width,
      y: height - value * height
    });
  }
  return points;
}

export function getSpeedColor(duration: number): string {
  if (duration >= 1200) return '#6C63FF';
  if (duration >= 600) return '#FF6584';
  return '#00C9A7';
}
