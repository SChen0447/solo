import * as THREE from 'three';

export interface ColorGradient {
  start: THREE.Color;
  end: THREE.Color;
}

export const DEFAULT_COLORS: ColorGradient = {
  start: new THREE.Color('#1a1a1a'),
  end: new THREE.Color('#4a4a4a')
};

export const DIRECTION_COLORS: Record<string, ColorGradient> = {
  left: { start: new THREE.Color('#d4a373'), end: new THREE.Color('#e9c46a') },
  right: { start: new THREE.Color('#6b705c'), end: new THREE.Color('#a5a58d') },
  up: { start: new THREE.Color('#a5a58d'), end: new THREE.Color('#b7b7a4') },
  down: { start: new THREE.Color('#cb997e'), end: new THREE.Color('#ddbea9') }
};

export const GOLD_COLORS: ColorGradient = {
  start: new THREE.Color('#ffd700'),
  end: new THREE.Color('#ff8c00')
};

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function generateColorGradientArray(
  gradient: ColorGradient,
  count: number
): Float32Array {
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const t = Math.random();
    const color = new THREE.Color().lerpColors(gradient.start, gradient.end, t);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  return colors;
}

export function interpolateColor(
  fromGradient: ColorGradient,
  toGradient: ColorGradient,
  progress: number,
  randomFactor: number = 0
): THREE.Color {
  const t = clamp(progress, 0, 1);
  const easedT = easeOutCubic(t);
  
  const fromColor = new THREE.Color().lerpColors(
    fromGradient.start,
    fromGradient.end,
    randomFactor
  );
  const toColor = new THREE.Color().lerpColors(
    toGradient.start,
    toGradient.end,
    randomFactor
  );
  
  return new THREE.Color().lerpColors(fromColor, toColor, easedT);
}

export function lerpColorArray(
  fromColors: Float32Array,
  toColors: Float32Array,
  progress: number,
  outColors: Float32Array
): void {
  const t = clamp(progress, 0, 1);
  const easedT = easeOutCubic(t);
  
  for (let i = 0; i < fromColors.length; i++) {
    outColors[i] = fromColors[i] + (toColors[i] - fromColors[i]) * easedT;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

export function getDirectionFromVector(dx: number, dy: number): string {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  } else {
    return dy > 0 ? 'down' : 'up';
  }
}

export function getDirectionColors(dx: number, dy: number): ColorGradient {
  const direction = getDirectionFromVector(dx, dy);
  return DIRECTION_COLORS[direction] || DEFAULT_COLORS;
}

export function randomPointInCone(
  height: number,
  bottomRadius: number,
  topRadius: number,
  isUpsideDown: boolean = false
): THREE.Vector3 {
  const t = Math.random();
  const currentRadius = topRadius + (bottomRadius - topRadius) * Math.sqrt(t);
  const angle = Math.random() * Math.PI * 2;
  
  const x = Math.cos(angle) * currentRadius;
  const z = Math.sin(angle) * currentRadius;
  const y = isUpsideDown ? -t * height : t * height;
  
  return new THREE.Vector3(x, y, z);
}

export function randomPointOnSphere(radius: number): THREE.Vector3 {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.sin(phi) * Math.sin(theta);
  const z = radius * Math.cos(phi);
  
  return new THREE.Vector3(x, y, z);
}

export function degToRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function radToDeg(rad: number): number {
  return rad * (180 / Math.PI);
}

export function createWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#5c3a21');
  gradient.addColorStop(0.3, '#6b4423');
  gradient.addColorStop(0.5, '#5c3a21');
  gradient.addColorStop(0.7, '#4a2c17');
  gradient.addColorStop(1, '#5c3a21');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  
  for (let i = 0; i < 30; i++) {
    ctx.strokeStyle = `rgba(40, 20, 10, ${Math.random() * 0.3})`;
    ctx.lineWidth = Math.random() * 2 + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, Math.random() * 256);
    for (let x = 0; x < 256; x += 10) {
      ctx.lineTo(x, Math.random() * 20 - 10 + (i * 8));
    }
    ctx.stroke();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createPaperTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#f5e6c8';
  ctx.fillRect(0, 0, 512, 512);
  
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = Math.random() * 1.5;
    const alpha = Math.random() * 0.08;
    ctx.fillStyle = `rgba(139, 119, 101, ${alpha})`;
    ctx.fillRect(x, y, size, size);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
