import { scaleLinear } from 'd3-scale';
import type { RGB } from '../types';

export function wavelengthToRgb(wavelength: number): RGB {
  let r = 0;
  let g = 0;
  let b = 0;

  if (wavelength >= 380 && wavelength < 440) {
    r = -(wavelength - 440) / (440 - 380);
    g = 0;
    b = 1;
  } else if (wavelength >= 440 && wavelength < 490) {
    r = 0;
    g = (wavelength - 440) / (490 - 440);
    b = 1;
  } else if (wavelength >= 490 && wavelength < 510) {
    r = 0;
    g = 1;
    b = -(wavelength - 510) / (510 - 490);
  } else if (wavelength >= 510 && wavelength < 580) {
    r = (wavelength - 510) / (580 - 510);
    g = 1;
    b = 0;
  } else if (wavelength >= 580 && wavelength < 645) {
    r = 1;
    g = -(wavelength - 645) / (645 - 580);
    b = 0;
  } else if (wavelength >= 645 && wavelength <= 780) {
    r = 1;
    g = 0;
    b = 0;
  }

  let factor = 1;
  if (wavelength >= 380 && wavelength < 420) {
    factor = 0.3 + (0.7 * (wavelength - 380)) / (420 - 380);
  } else if (wavelength >= 700 && wavelength <= 780) {
    factor = 0.3 + (0.7 * (780 - wavelength)) / (780 - 700);
  }

  const gamma = 0.8;
  const r255 = Math.round(255 * Math.pow(r * factor, gamma));
  const g255 = Math.round(255 * Math.pow(g * factor, gamma));
  const b255 = Math.round(255 * Math.pow(b * factor, gamma));

  return { r: r255, g: g255, b: b255 };
}

export function createWavelengthGradient(): string {
  const stops: Array<{ nm: number; color: string }> = [
    { nm: 380, color: wavelengthToRgb(380) },
    { nm: 420, color: wavelengthToRgb(420) },
    { nm: 450, color: wavelengthToRgb(450) },
    { nm: 480, color: wavelengthToRgb(480) },
    { nm: 510, color: wavelengthToRgb(510) },
    { nm: 550, color: wavelengthToRgb(550) },
    { nm: 580, color: wavelengthToRgb(580) },
    { nm: 610, color: wavelengthToRgb(610) },
    { nm: 645, color: wavelengthToRgb(645) },
    { nm: 700, color: wavelengthToRgb(700) },
    { nm: 780, color: wavelengthToRgb(780) },
  ];

  const scale = scaleLinear().domain([380, 780]).range([0, 100]);

  const gradientStops = stops
    .map((s) => {
      const percent = scale(s.nm);
      const { r, g, b } = s.color;
      return `rgb(${r},${g},${b}) ${percent}%`;
    })
    .join(', ');

  return `linear-gradient(to right, ${gradientStops})`;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function estimateColorTemperature(
  sources: Array<{ wavelength: number; intensity: number; enabled: boolean }>
): string {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const s of sources) {
    if (!s.enabled) continue;
    const weight = s.intensity;
    if (weight <= 0) continue;
    totalWeight += weight;
    weightedSum += s.wavelength * weight;
  }

  if (totalWeight === 0) return '无光源';

  const avgWavelength = weightedSum / totalWeight;

  if (avgWavelength < 450) return '冷蓝 (Cool Blue)';
  if (avgWavelength < 490) return '冷青 (Cool Cyan)';
  if (avgWavelength < 530) return '日光 (Daylight)';
  if (avgWavelength < 570) return '中性白 (Neutral White)';
  if (avgWavelength < 600) return '暖黄 (Warm Yellow)';
  if (avgWavelength < 640) return '暖橙 (Warm Orange)';
  return '暖红 (Warm Red)';
}
