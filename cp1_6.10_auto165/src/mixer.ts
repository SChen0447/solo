import { RGB, Bucket } from './palette';

export interface MixedPixel {
  x: number;
  y: number;
  color: RGB;
  alpha: number;
  size: number;
}

export interface MixPair {
  bucketA: Bucket;
  bucketB: Bucket;
  distance: number;
  intensity: number;
}

export function mixColors(colorA: RGB, colorB: RGB, intensity: number): RGB {
  const t = Math.max(0, Math.min(1, intensity));
  return {
    r: Math.round(colorA.r + (colorB.r - colorA.r) * t),
    g: Math.round(colorA.g + (colorB.g - colorA.g) * t),
    b: Math.round(colorA.b + (colorB.b - colorA.b) * t),
  };
}

export function getMixPairs(buckets: Bucket[], nearThreshold: number = 60, farThreshold: number = 80): MixPair[] {
  const pairs: MixPair[] = [];
  for (let i = 0; i < buckets.length; i++) {
    for (let j = i + 1; j < buckets.length; j++) {
      const a = buckets[i];
      const b = buckets[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < farThreshold) {
        let intensity: number;
        if (distance <= nearThreshold) {
          intensity = 1;
        } else {
          intensity = 1 - (distance - nearThreshold) / (farThreshold - nearThreshold);
        }
        pairs.push({ bucketA: a, bucketB: b, distance, intensity });
      }
    }
  }
  return pairs;
}

export function checkFusionTrigger(bucketA: Bucket, bucketB: Bucket, threshold: number = 30): boolean {
  const dx = bucketB.x - bucketA.x;
  const dy = bucketB.y - bucketA.y;
  return Math.sqrt(dx * dx + dy * dy) < threshold;
}

export function getSecondaryColor(hexA: string, hexB: string): string | null {
  const normA = hexA.toUpperCase();
  const normB = hexB.toUpperCase();
  const pair = [normA, normB].sort().join('+');
  const map: Record<string, string> = {
    '#0000FF+#FF0000': '#8000FF',
    '#0000FF+#FFFF00': '#00FF80',
    '#FF0000+#FFFF00': '#FF8000',
  };
  return map[pair] || null;
}

export function generateGradientPixels(pair: MixPair): MixedPixel[] {
  const pixels: MixedPixel[] = [];
  const { bucketA, bucketB, intensity } = pair;
  const steps = 30;
  const featherRadius = 18;

  for (let step = 0; step <= steps; step++) {
    const t = step / steps;
    const x = bucketA.x + (bucketB.x - bucketA.x) * t;
    const y = bucketA.y + (bucketB.y - bucketA.y) * t;
    const color = mixColors(bucketA.color, bucketB.color, t);
    const centerAlpha = 0.3 + 0.3 * intensity;

    const sampleCount = 3;
    for (let s = 0; s < sampleCount; s++) {
      const angle = (Math.PI * 2 * s) / sampleCount;
      const dist = Math.random() * featherRadius;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      const falloff = 1 - dist / featherRadius;
      pixels.push({
        x: px,
        y: py,
        color,
        alpha: centerAlpha * falloff * (0.7 + Math.random() * 0.3),
        size: 3 + Math.random() * 3,
      });
    }
  }

  return pixels;
}

export function generateMixParticles(pair: MixPair, count: number = 8): MixedPixel[] {
  const particles: MixedPixel[] = [];
  const { bucketA, bucketB } = pair;
  const midX = (bucketA.x + bucketB.x) / 2;
  const midY = (bucketA.y + bucketB.y) / 2;
  const midColor = mixColors(bucketA.color, bucketB.color, 0.5);

  for (let i = 0; i < count; i++) {
    const t = Math.random();
    particles.push({
      x: bucketA.x + (bucketB.x - bucketA.x) * t + (Math.random() - 0.5) * 10,
      y: bucketA.y + (bucketB.y - bucketA.y) * t + (Math.random() - 0.5) * 10,
      color: t < 0.33 ? bucketA.color : t < 0.66 ? midColor : bucketB.color,
      alpha: 0.4 + Math.random() * 0.3,
      size: 2 + Math.random() * 2,
    });
  }

  for (let i = 0; i < count / 2; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3;
    particles.push({
      x: midX,
      y: midY,
      color: midColor,
      alpha: 0.5,
      size: 3 + Math.random() * 2,
    });
  }

  return particles;
}
