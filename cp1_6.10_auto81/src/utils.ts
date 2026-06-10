import { v4 as uuidv4 } from 'uuid';

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export interface ColorStop {
  id: string;
  color: HSLColor;
  position: number;
}

export interface Preset {
  name: string;
  stops: ColorStop[];
  angle: number;
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hslToString(c: HSLColor): string {
  return `hsl(${c.h}, ${c.s}%, ${c.l}%)`;
}

export function gradientToCSS(stops: ColorStop[], angle: number): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  const parts = sorted.map(s => `${hslToString(s.color)} ${s.position}%`);
  return `background: linear-gradient(${angle}deg, ${parts.join(', ')});`;
}

export function gradientToStopsArray(stops: ColorStop[]): string {
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  return sorted.map(s => `${hslToString(s.color)} ${s.position}%`).join(', ');
}

export function validateStops(stops: ColorStop[]): ColorStop[] {
  const minGap = 10 / 100;
  const sorted = [...stops].sort((a, b) => a.position - b.position);
  for (let i = 0; i < sorted.length; i++) {
    sorted[i].position = Math.max(0, Math.min(100, sorted[i].position));
  }
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].position;
    if (sorted[i].position < prev + minGap * 100) {
      sorted[i].position = Math.min(100, prev + minGap * 100);
    }
  }
  for (let i = sorted.length - 2; i >= 0; i--) {
    const next = sorted[i + 1].position;
    if (sorted[i].position > next - minGap * 100) {
      sorted[i].position = Math.max(0, next - minGap * 100);
    }
  }
  return sorted;
}

function makeStop(h: number, s: number, l: number, pos: number): ColorStop {
  return { id: uuidv4(), color: { h, s, l }, position: pos };
}

export function generatePresets(): Preset[] {
  return [
    {
      name: '日落橙黄',
      angle: 90,
      stops: [
        makeStop(0, 95, 60, 0),
        makeStop(30, 100, 55, 35),
        makeStop(50, 100, 60, 70),
        makeStop(60, 100, 65, 100),
      ],
    },
    {
      name: '海洋蓝绿',
      angle: 135,
      stops: [
        makeStop(180, 80, 35, 0),
        makeStop(195, 85, 45, 33),
        makeStop(170, 75, 55, 66),
        makeStop(160, 70, 65, 100),
      ],
    },
    {
      name: '极光紫绿',
      angle: 120,
      stops: [
        makeStop(280, 80, 45, 0),
        makeStop(260, 75, 55, 25),
        makeStop(180, 70, 55, 55),
        makeStop(140, 70, 55, 100),
      ],
    },
    {
      name: '火焰红黄',
      angle: 45,
      stops: [
        makeStop(0, 100, 40, 0),
        makeStop(5, 100, 50, 30),
        makeStop(35, 100, 55, 65),
        makeStop(55, 100, 60, 100),
      ],
    },
    {
      name: '森林绿棕',
      angle: 160,
      stops: [
        makeStop(30, 40, 30, 0),
        makeStop(80, 45, 35, 30),
        makeStop(120, 50, 35, 60),
        makeStop(140, 40, 45, 100),
      ],
    },
    {
      name: '薰衣草粉紫',
      angle: 180,
      stops: [
        makeStop(320, 60, 75, 0),
        makeStop(300, 65, 70, 33),
        makeStop(270, 60, 75, 66),
        makeStop(240, 55, 80, 100),
      ],
    },
    {
      name: '深海暗夜',
      angle: 180,
      stops: [
        makeStop(230, 60, 15, 0),
        makeStop(220, 55, 25, 40),
        makeStop(210, 50, 35, 70),
        makeStop(200, 45, 45, 100),
      ],
    },
    {
      name: '樱花粉白',
      angle: 90,
      stops: [
        makeStop(340, 70, 85, 0),
        makeStop(330, 75, 80, 40),
        makeStop(320, 65, 85, 70),
        makeStop(310, 60, 90, 100),
      ],
    },
  ];
}

export function getDefaultStops(): ColorStop[] {
  return [
    makeStop(210, 90, 60, 0),
    makeStop(240, 85, 65, 33),
    makeStop(270, 80, 70, 66),
    makeStop(300, 85, 75, 100),
  ];
}
