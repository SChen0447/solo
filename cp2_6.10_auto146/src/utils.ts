import * as THREE from 'three';

export function viridis(t: number): THREE.Color {
  const clamped = Math.max(0, Math.min(1, t));
  const r = 0.2777 + clamped * (0.105 + clamped * (-0.3308 + clamped * (-4.6343 + clamped * (6.2283 + clamped * (4.7764 - clamped * 5.4355)))));
  const g = 0.0054 + clamped * (1.4046 + clamped * (0.2148 + clamped * (0.2148 + clamped * (-2.8393 + clamped * (0.6818 + clamped * 1.4358)))));
  const b = 0.3341 + clamped * (1.3846 + clamped * (0.0905 + clamped * (-4.5785 + clamped * (7.5691 + clamped * (-3.7191 + clamped * 0.2382)))));
  return new THREE.Color(
    Math.max(0, Math.min(1, r)),
    Math.max(0, Math.min(1, g)),
    Math.max(0, Math.min(1, b))
  );
}

export function createAxisLabel(text: string, color: number = 0xffffff): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, 256, 128);
  ctx.font = 'bold 56px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.fillText(text, 128, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(8, 4, 1);
  return sprite;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class FPSMonitor {
  private frames: number = 0;
  private lastTime: number = performance.now();
  private element: HTMLDivElement;
  private currentFPS: number = 60;

  constructor(container: HTMLElement) {
    this.element = document.createElement('div');
    this.element.style.position = 'absolute';
    this.element.style.top = '12px';
    this.element.style.right = '12px';
    this.element.style.padding = '6px 12px';
    this.element.style.background = 'rgba(30, 30, 46, 0.85)';
    this.element.style.color = '#f59e0b';
    this.element.style.fontFamily = 'monospace';
    this.element.style.fontSize = '12px';
    this.element.style.borderRadius = '6px';
    this.element.style.pointerEvents = 'none';
    this.element.style.zIndex = '10';
    this.element.textContent = 'FPS: 60';
    container.appendChild(this.element);
  }

  update(): number {
    this.frames++;
    const now = performance.now();
    if (now - this.lastTime >= 500) {
      this.currentFPS = Math.round((this.frames * 1000) / (now - this.lastTime));
      this.element.textContent = `FPS: ${this.currentFPS}`;
      this.frames = 0;
      this.lastTime = now;
    }
    return this.currentFPS;
  }

  getFPS(): number {
    return this.currentFPS;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}
