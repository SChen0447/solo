export interface LavaBlob {
  id: string;
  x: number;
  y: number;
  radius: number;
  targetRadius: number;
  vx: number;
  vy: number;
  noiseOffset: number;
  noiseSpeed: number;
  scaleAnimation: {
    active: boolean;
    startTime: number;
    startScale: number;
    endScale: number;
  };
  vertices: number;
}

export interface EnergyParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  lifeTime: number;
  createdAt: number;
}

export interface RippleEffect {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export interface ColorScheme {
  id: string;
  name: string;
  unlocked: boolean;
  background: {
    bottom: string;
    top: string;
  };
  lava: {
    center: string;
    edge: string;
  };
  glow: string;
  complementary: string;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'warm-orange',
    name: '暖橙-红',
    unlocked: true,
    background: {
      bottom: '#e65c00',
      top: '#ffb347',
    },
    lava: {
      center: '#ffcc33',
      edge: '#cc5500',
    },
    glow: '#ff9933',
    complementary: '#3399ff',
  },
  {
    id: 'emerald-cyan',
    name: '翠绿-青',
    unlocked: false,
    background: {
      bottom: '#00b894',
      top: '#81ecec',
    },
    lava: {
      center: '#55efc4',
      edge: '#00b894',
    },
    glow: '#00cec9',
    complementary: '#ff6b6b',
  },
  {
    id: 'violet-pink',
    name: '紫罗兰-粉',
    unlocked: false,
    background: {
      bottom: '#6c5ce7',
      top: '#fd79a8',
    },
    lava: {
      center: '#a29bfe',
      edge: '#6c5ce7',
    },
    glow: '#e056fd',
    complementary: '#f9ca24',
  },
  {
    id: 'amber-gold',
    name: '琥珀-金',
    unlocked: false,
    background: {
      bottom: '#d35400',
      top: '#f1c40f',
    },
    lava: {
      center: '#f39c12',
      edge: '#d35400',
    },
    glow: '#e67e22',
    complementary: '#3498db',
  },
];
