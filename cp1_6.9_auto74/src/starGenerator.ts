import * as THREE from 'three';

export const PARTICLE_COUNT = 5000;
export const SPHERE_RADIUS = 300;
export const BRIGHT_STAR_COUNT = 30;

export interface StarData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  twinklePhases: Float32Array;
  twinkleSpeeds: Float32Array;
  originalColors: Float32Array;
  distances: Float32Array;
  group: THREE.Group;
}

export function generateStars(): StarData {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const originalColors = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);
  const twinklePhases = new Float32Array(PARTICLE_COUNT);
  const twinkleSpeeds = new Float32Array(PARTICLE_COUNT);
  const distances = new Float32Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.pow(Math.random(), 1 / 3) * SPHERE_RADIUS;

    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);

    distances[i] = r;

    const hue = Math.random();
    const sat = 0.6 + Math.random() * 0.4;
    const val = 0.8 + Math.random() * 0.2;

    const rgb = hsvToRgb(hue, sat, val);
    colors[i3] = rgb.r;
    colors[i3 + 1] = rgb.g;
    colors[i3 + 2] = rgb.b;

    originalColors[i3] = rgb.r;
    originalColors[i3 + 1] = rgb.g;
    originalColors[i3 + 2] = rgb.b;

    sizes[i] = 2 + Math.random() * 2;

    twinklePhases[i] = Math.random() * Math.PI * 2;
    twinkleSpeeds[i] = (1 + Math.random() * 2) / 1000;
  }

  const group = new THREE.Group();

  for (let i = 0; i < BRIGHT_STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.pow(Math.random(), 1 / 3) * SPHERE_RADIUS * 0.9;

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.5, 'rgba(200, 220, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
    sprite.scale.set(15, 15, 1);
    sprite.userData = {
      baseOpacity: 0.7 + Math.random() * 0.3,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: (0.5 + Math.random() * 1) / 1000
    };
    group.add(sprite);
  }

  return { positions, colors, sizes, twinklePhases, twinkleSpeeds, originalColors, distances, group };
}

export function updateStarRotation(group: THREE.Group, deltaMs: number): void {
  group.rotation.y += 0.001 * (deltaMs / 16.67);
}

export function updateTwinkle(
  colors: Float32Array,
  originalColors: Float32Array,
  twinklePhases: Float32Array,
  twinkleSpeeds: Float32Array,
  currentTime: number
): void {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    const phase = twinklePhases[i] + currentTime * twinkleSpeeds[i];
    const brightness = 0.7 + 0.3 * Math.sin(phase);

    colors[i3] = originalColors[i3] * brightness;
    colors[i3 + 1] = originalColors[i3 + 1] * brightness;
    colors[i3 + 2] = originalColors[i3 + 2] * brightness;
  }
}

export function updateBrightStars(group: THREE.Group, currentTime: number): void {
  group.children.forEach((child) => {
    const sprite = child as THREE.Sprite;
    const data = sprite.userData;
    const phase = data.twinklePhase + currentTime * data.twinkleSpeed;
    const opacity = data.baseOpacity * (0.6 + 0.4 * Math.sin(phase));
    (sprite.material as THREE.SpriteMaterial).opacity = opacity;
  });
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r = 0, g = 0, b = 0;

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }

  return { r, g, b };
}
