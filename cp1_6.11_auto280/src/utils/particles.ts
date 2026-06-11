import type { Particle } from '@/types';

let particleIdCounter = 0;

export const createSuccessParticles = (x: number, y: number, color: string, count: number = 20): Particle[] => {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: particleIdCounter++,
      x: x + (Math.random() - 0.5) * 40,
      y: y,
      vx: (Math.random() - 0.5) * 3,
      vy: -Math.random() * 4 - 2,
      size: 6 + Math.random() * 6,
      color,
      alpha: 1,
      decay: 0.015 + Math.random() * 0.01,
      type: 'success'
    });
  }
  return particles;
};

export const createSmokeParticles = (x: number, y: number, count: number = 30): Particle[] => {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: particleIdCounter++,
      x: x + (Math.random() - 0.5) * 60,
      y: y + Math.random() * 20,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -Math.random() * 1.5 - 0.5,
      size: 4 + Math.random() * 4,
      color: '#4a4a4a',
      alpha: 0.8,
      decay: 0.008 + Math.random() * 0.005,
      type: 'smoke'
    });
  }
  return particles;
};

export const createBubbleParticles = (x: number, y: number, color: string, count: number = 3): Particle[] => {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: particleIdCounter++,
      x: x + (Math.random() - 0.5) * 30,
      y: y + Math.random() * 10,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -Math.random() * 1.5 - 0.5,
      size: 2 + Math.random() * 3,
      color,
      alpha: 0.7,
      decay: 0.02 + Math.random() * 0.01,
      type: 'bubble'
    });
  }
  return particles;
};

export const updateParticles = (particles: Particle[]): Particle[] => {
  return particles
    .map(p => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      alpha: p.alpha - p.decay,
      size: p.type === 'smoke' ? p.size + 0.1 : p.size
    }))
    .filter(p => p.alpha > 0);
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 255, g: 255, b: 255 };
};

export const mixColors = (colors: string[]): string => {
  if (colors.length === 0) return '#333333';
  if (colors.length === 1) return colors[0];
  let r = 0, g = 0, b = 0;
  colors.forEach(c => {
    const rgb = hexToRgb(c);
    r += rgb.r;
    g += rgb.g;
    b += rgb.b;
  });
  r = Math.round(r / colors.length);
  g = Math.round(g / colors.length);
  b = Math.round(b / colors.length);
  return `rgb(${r}, ${g}, ${b})`;
};
