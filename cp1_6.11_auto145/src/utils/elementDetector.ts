import type { ElementType } from '../types';
import { hexToHsl } from './colorUtils';

export function detectElement(color: string): ElementType {
  const { h, s, l } = hexToHsl(color);
  if (s < 15 || l < 10 || l > 90) {
    return 'earth';
  }
  const hue = ((h % 360) + 360) % 360;
  if (hue <= 40 || hue >= 350) {
    return 'fire';
  }
  if (hue >= 170 && hue <= 250) {
    return 'water';
  }
  if (hue >= 60 && hue <= 150) {
    return 'earth';
  }
  if (hue >= 260 && hue <= 340) {
    return 'wind';
  }
  if (hue > 40 && hue < 60) {
    return hue < 50 ? 'fire' : 'earth';
  }
  if (hue > 150 && hue < 170) {
    return 'water';
  }
  if (hue > 250 && hue < 260) {
    return 'wind';
  }
  if (hue > 340 && hue < 350) {
    return 'fire';
  }
  return 'earth';
}

export const elementInfo: Record<ElementType, { name: string; icon: string; color: string }> = {
  fire: { name: '火', icon: '🔥', color: '#ff5722' },
  water: { name: '水', icon: '💧', color: '#2196f3' },
  earth: { name: '地', icon: '🌿', color: '#4caf50' },
  wind: { name: '风', icon: '🌀', color: '#ba68c8' },
};
