import * as THREE from 'three';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function degToRad(deg: number): number {
  return deg * Math.PI / 180;
}

export function radToDeg(rad: number): number {
  return rad * 180 / Math.PI;
}

export function hslToRgb(h: number, s: number, l: number): THREE.Color {
  const color = new THREE.Color();
  color.setHSL(h, s, l);
  return color;
}

export function lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  const result = new THREE.Color();
  result.lerpColors(color1, color2, t);
  return result;
}

export function randomColorVariation(baseColor: THREE.Color, variation: number): THREE.Color {
  if (variation <= 0) return baseColor.clone();
  
  const hsl = { h: 0, s: 0, l: 0 };
  baseColor.getHSL(hsl);
  
  const hueOffset = (Math.random() - 0.5) * 2 * variation * (60 / 360);
  const satOffset = (Math.random() - 0.5) * variation * 0.3;
  const lightOffset = (Math.random() - 0.5) * variation * 0.2;
  
  const result = new THREE.Color();
  result.setHSL(
    (hsl.h + hueOffset + 1) % 1,
    Math.max(0, Math.min(1, hsl.s + satOffset)),
    Math.max(0, Math.min(1, hsl.l + lightOffset))
  );
  
  return result;
}

export function createRandomRotation(up: THREE.Vector3, angleRange: [number, number]): THREE.Quaternion {
  const angle = randomRange(angleRange[0], angleRange[1]) * Math.PI / 180;
  const axis = new THREE.Vector3(
    Math.random() - 0.5,
    0,
    Math.random() - 0.5
  ).normalize();
  
  const quat = new THREE.Quaternion();
  quat.setFromAxisAngle(axis, angle);
  
  return quat;
}

export function getRadiusForLevel(level: number, maxLevel: number, baseRadius: number = 0.15): number {
  const t = level / Math.max(1, maxLevel);
  return baseRadius * (1 - t * 0.67);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
