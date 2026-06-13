import * as THREE from 'three';
import { COLORS, CHINESE_CHARS, ENGLISH_WORDS } from './types';

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

export function randomColor(): THREE.Color {
  const hex = COLORS[randomInt(0, COLORS.length - 1)];
  return new THREE.Color(hex);
}

export function randomText(): string {
  if (Math.random() < 0.6) {
    return CHINESE_CHARS[randomInt(0, CHINESE_CHARS.length - 1)];
  } else {
    return ENGLISH_WORDS[randomInt(0, ENGLISH_WORDS.length - 1)];
  }
}

export function createTextTexture(
  text: string,
  color: THREE.Color,
  opacity: number,
  size: number
): THREE.Texture {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  
  const fontSize = Math.floor(128 * size);
  canvas.width = 512;
  canvas.height = 512;
  
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  context.shadowColor = `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, ${opacity})`;
  context.shadowBlur = 20;
  
  context.font = `bold ${fontSize}px 'Microsoft YaHei', Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = `rgba(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)}, ${opacity})`;
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color(
    color1.r + (color2.r - color1.r) * t,
    color1.g + (color2.g - color1.g) * t,
    color1.b + (color2.b - color1.b) * t
  );
}

export function mixColors(colors: THREE.Color[]): THREE.Color {
  if (colors.length === 0) return new THREE.Color(0xffffff);
  let r = 0, g = 0, b = 0;
  for (const c of colors) {
    r += c.r;
    g += c.g;
    b += c.b;
  }
  return new THREE.Color(r / colors.length, g / colors.length, b / colors.length);
}

export function getResponsiveScale(): number {
  return window.innerWidth < 768 ? 0.7 : 1.0;
}

export function getDragSensitivity(): number {
  return window.innerWidth < 768 ? 1.2 : 1.0;
}
