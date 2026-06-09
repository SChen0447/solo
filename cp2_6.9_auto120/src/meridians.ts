export interface Meridian {
  id: string;
  name: string;
  path: string;
  colorStart: string;
  colorEnd: string;
  phase: number;
  speed: number;
}

export interface FlowParams {
  intensity: number;
  speedMultiplier: number;
  temperature: number;
  isNightMode: boolean;
  time: number;
}

export const BODY_WIDTH = 200;
export const BODY_HEIGHT = 600;

export const MERIDIANS: Meridian[] = [
  {
    id: 'lung',
    name: '手太阴肺经',
    path: 'M 100 80 C 110 120 140 150 170 200 C 175 240 170 280 165 320 L 160 340',
    colorStart: '#FF4B4B',
    colorEnd: '#FF9A4A',
    phase: 0,
    speed: 1.0
  },
  {
    id: 'large_intestine',
    name: '手阳明大肠经',
    path: 'M 160 340 L 165 300 C 175 260 180 220 170 180 C 150 140 130 120 100 90',
    colorStart: '#FF9A4A',
    colorEnd: '#FFD700',
    phase: Math.PI / 6,
    speed: 1.1
  },
  {
    id: 'stomach',
    name: '足阳明胃经',
    path: 'M 100 90 C 130 110 155 140 160 180 C 165 240 155 300 150 360 C 148 420 145 480 140 540 L 138 590',
    colorStart: '#FFD700',
    colorEnd: '#ADFF2F',
    phase: Math.PI / 3,
    speed: 0.9
  },
  {
    id: 'spleen',
    name: '足太阴脾经',
    path: 'M 138 590 L 142 540 C 148 480 152 420 148 360 C 145 300 135 240 110 180 C 95 150 85 120 100 90',
    colorStart: '#ADFF2F',
    colorEnd: '#32CD32',
    phase: Math.PI / 2,
    speed: 1.0
  },
  {
    id: 'heart',
    name: '手少阴心经',
    path: 'M 100 80 C 90 120 60 150 30 200 C 25 240 30 280 35 320 L 40 340',
    colorStart: '#FF1493',
    colorEnd: '#FF69B4',
    phase: Math.PI * 2 / 3,
    speed: 0.85
  },
  {
    id: 'small_intestine',
    name: '手太阳小肠经',
    path: 'M 40 340 L 35 300 C 25 260 20 220 30 180 C 50 140 70 120 100 90',
    colorStart: '#9B59B6',
    colorEnd: '#8E44AD',
    phase: Math.PI * 5 / 6,
    speed: 1.05
  },
  {
    id: 'bladder',
    name: '足太阳膀胱经',
    path: 'M 100 90 C 110 130 120 180 120 240 C 122 320 125 400 122 480 C 120 530 118 560 115 590',
    colorStart: '#4169E1',
    colorEnd: '#1E90FF',
    phase: Math.PI,
    speed: 0.95
  },
  {
    id: 'kidney',
    name: '足少阴肾经',
    path: 'M 85 590 L 80 540 C 75 480 72 420 78 360 C 80 300 85 240 100 180 C 105 150 108 120 100 90',
    colorStart: '#4B9EFF',
    colorEnd: '#9B59B6',
    phase: Math.PI * 7 / 6,
    speed: 1.0
  },
  {
    id: 'pericardium',
    name: '手厥阴心包经',
    path: 'M 100 95 C 95 130 75 160 50 200 C 45 250 50 290 55 330 L 55 350',
    colorStart: '#DC143C',
    colorEnd: '#FF6347',
    phase: Math.PI * 4 / 3,
    speed: 0.9
  },
  {
    id: 'triple_heater',
    name: '手少阳三焦经',
    path: 'M 145 350 L 150 310 C 155 270 158 230 150 190 C 135 150 118 125 100 95',
    colorStart: '#00CED1',
    colorEnd: '#20B2AA',
    phase: Math.PI * 3 / 2,
    speed: 1.1
  },
  {
    id: 'gallbladder',
    name: '足少阳胆经',
    path: 'M 100 95 C 115 120 130 160 130 220 C 132 300 135 380 130 460 C 128 510 125 550 125 590',
    colorStart: '#228B22',
    colorEnd: '#006400',
    phase: Math.PI * 5 / 3,
    speed: 1.0
  },
  {
    id: 'liver',
    name: '足厥阴肝经',
    path: 'M 75 590 L 72 540 C 68 480 65 420 72 360 C 78 300 85 240 100 180 C 102 150 100 120 100 95',
    colorStart: '#32CD32',
    colorEnd: '#00FA9A',
    phase: Math.PI * 11 / 6,
    speed: 0.95
  }
];

export function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

export function getTemperatureColor(temperature: number): string {
  const t = Math.max(0, Math.min(1, temperature));
  return lerpColor('#4B9EFF', '#FF4B4B', t);
}

export function generateAnimatedPath(
  basePath: Path2D,
  _meridian: Meridian,
  _params: FlowParams
): Path2D {
  return basePath;
}

export function getGlowStyle(
  meridian: Meridian,
  params: FlowParams
): { color: string; blur: number } {
  const intensity = params.intensity / 100;
  const baseColor = lerpColor(meridian.colorStart, meridian.colorEnd, 0.5);
  const glowAmount = params.isNightMode ? 10 * intensity : 3 * intensity;
  return { color: baseColor, blur: glowAmount };
}

export function getWaveOffset(
  meridian: Meridian,
  params: FlowParams
): number {
  const speed = 0.5 * params.speedMultiplier * meridian.speed;
  return Math.sin(params.time * speed * Math.PI * 2 + meridian.phase) * 3;
}
