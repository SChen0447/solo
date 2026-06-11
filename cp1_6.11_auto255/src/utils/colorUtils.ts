export interface RGBColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export const hexToRgb = (hex: string): RGBColor => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: 255,
      }
    : { r: 0, g: 0, b: 0, a: 255 };
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
};

export const applyInkDiffusion = (
  imageData: ImageData,
  centerX: number,
  centerY: number,
  radius: number,
  color: RGBColor,
  intensity: number
): void => {
  const { data, width, height } = imageData;
  const intRadius = Math.ceil(radius);

  for (let dy = -intRadius; dy <= intRadius; dy++) {
    for (let dx = -intRadius; dx <= intRadius; dx++) {
      const px = Math.floor(centerX + dx);
      const py = Math.floor(centerY + dy);

      if (px < 0 || px >= width || py < 0 || py >= height) continue;

      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;

      const falloff = 1 - dist / radius;
      const alpha = intensity * falloff * falloff * color.a / 255;

      const idx = (py * width + px) * 4;
      const bgR = data[idx];
      const bgG = data[idx + 1];
      const bgB = data[idx + 2];
      const bgA = data[idx] / 255;

      const outA = alpha + bgA * (1 - alpha);
      if (outA === 0) continue;

      data[idx] = (color.r * alpha + bgR * bgA * (1 - alpha)) / outA;
      data[idx + 1] = (color.g * alpha + bgG * bgA * (1 - alpha)) / outA;
      data[idx + 2] = (color.b * alpha + bgB * bgA * (1 - alpha)) / outA;
      data[idx + 3] = Math.min(255, Math.max(0, outA * 255));
    }
  }
};

export const wetToDryColor = (color: RGBColor, dryness: number): RGBColor => {
  const dryFactor = Math.max(0, Math.min(1, dryness));
  const wetFactor = 1 - dryFactor;

  const whiteMix = wetFactor * 0.3;
  const darkenFactor = dryFactor * 0.15;

  const r = Math.min(255, color.r * (1 + whiteMix) * (1 - darkenFactor));
  const g = Math.min(255, color.g * (1 + whiteMix) * (1 - darkenFactor));
  const b = Math.min(255, color.b * (1 + whiteMix) * (1 - darkenFactor));

  return {
    r: Math.max(0, Math.min(255, r)),
    g: Math.max(0, Math.min(255, g)),
    b: Math.max(0, Math.min(255, b)),
    a: color.a,
  };
};

export const getWetHighlight = (dryness: number): number => {
  return 0.3 * (1 - Math.max(0, Math.min(1, dryness)));
};

export const temperatureColor = (angle: number): string => {
  const t = Math.max(0, Math.min(1, angle / 90));
  
  const warmR = 255, warmG = 213, warmB = 79;
  const coolR = 227, coolG = 242, coolB = 253;
  
  const r = Math.round(warmR + (coolR - warmR) * t);
  const g = Math.round(warmG + (coolG - warmG) * t);
  const b = Math.round(warmB + (coolB - warmB) * t);
  
  return rgbToHex(r, g, b);
};

export const getDryingTime = (
  humidity: number,
  windSpeed: number,
  sunAngle: number
): number => {
  const baseTime = 25000;
  const humidityFactor = 0.5 + (humidity / 100) * 1.5;
  const windFactor = 1 - (windSpeed / 5) * 0.4;
  const sunFactor = 1 - (sunAngle / 90) * 0.3;
  
  return baseTime * humidityFactor * windFactor * sunFactor;
};

export const paletteColors = [
  { name: '朱砂红', hex: '#c62828' },
  { name: '藤黄', hex: '#f9a825' },
  { name: '石绿', hex: '#388e3c' },
  { name: '青花蓝', hex: '#1565c0' },
  { name: '焦茶', hex: '#4e342e' },
  { name: '赭石', hex: '#6d4c41' },
  { name: '淡墨', hex: '#37474f' },
  { name: '藤紫', hex: '#7b1fa2' },
];
