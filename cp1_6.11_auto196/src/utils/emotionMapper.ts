export interface EmotionInfo {
  name: string;
  description: string;
  color: string;
}

export interface PresetEmotion extends EmotionInfo {
  position: number;
}

const WARM_COLOR = '#ff8c00';
const COLD_COLOR = '#00bfff';

export const presetEmotions: PresetEmotion[] = [
  {
    name: '激昂',
    description: '充满力量与决心，如火焰般燃烧',
    color: '#ff4500',
    position: 0.1,
  },
  {
    name: '喜悦',
    description: '温暖明媚，洋溢着幸福与希望',
    color: '#ffd700',
    position: 0.3,
  },
  {
    name: '宁静',
    description: '平和安详，如湖水般沉静',
    color: '#98fb98',
    position: 0.5,
  },
  {
    name: '忧伤',
    description: '淡淡的哀愁，如秋日落叶',
    color: '#6495ed',
    position: 0.7,
  },
  {
    name: '紧张',
    description: '紧绷压抑，风暴将至的预感',
    color: '#4169e1',
    position: 0.9,
  },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

export function getColorFromPosition(position: number): string {
  const clampedPos = Math.max(0, Math.min(1, position));
  const warm = hexToRgb(WARM_COLOR);
  const cold = hexToRgb(COLD_COLOR);

  const r = warm.r + (cold.r - warm.r) * clampedPos;
  const g = warm.g + (cold.g - warm.g) * clampedPos;
  const b = warm.b + (cold.b - warm.b) * clampedPos;

  return rgbToHex(r, g, b);
}

export function getPositionFromColor(color: string): number {
  const target = hexToRgb(color);
  const warm = hexToRgb(WARM_COLOR);
  const cold = hexToRgb(COLD_COLOR);

  const warmDist = Math.sqrt(
    Math.pow(target.r - warm.r, 2) +
      Math.pow(target.g - warm.g, 2) +
      Math.pow(target.b - warm.b, 2),
  );
  const totalDist = Math.sqrt(
    Math.pow(cold.r - warm.r, 2) +
      Math.pow(cold.g - warm.g, 2) +
      Math.pow(cold.b - warm.b, 2),
  );

  if (totalDist === 0) return 0;
  return Math.max(0, Math.min(1, warmDist / totalDist));
}

export function getComplementaryColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(255 - r, 255 - g, 255 - b);
}

export function getEmotionFromColor(color: string): EmotionInfo {
  const position = getPositionFromColor(color);
  return getEmotionFromPosition(position);
}

export function getEmotionFromPosition(position: number): EmotionInfo {
  const clampedPos = Math.max(0, Math.min(1, position));
  const color = getColorFromPosition(clampedPos);

  let closestEmotion = presetEmotions[0];
  let minDistance = Infinity;

  for (const emotion of presetEmotions) {
    const distance = Math.abs(clampedPos - emotion.position);
    if (distance < minDistance) {
      minDistance = distance;
      closestEmotion = emotion;
    }
  }

  const nextIndex =
    (presetEmotions.indexOf(closestEmotion) + 1) % presetEmotions.length;
  const nextEmotion = presetEmotions[nextIndex];
  const prevIndex =
    (presetEmotions.indexOf(closestEmotion) - 1 + presetEmotions.length) %
    presetEmotions.length;
  const prevEmotion = presetEmotions[prevIndex];

  let blendEmotion = closestEmotion;
  if (
    nextEmotion.position > closestEmotion.position &&
    clampedPos > closestEmotion.position
  ) {
    const range = nextEmotion.position - closestEmotion.position;
    const t = range > 0 ? (clampedPos - closestEmotion.position) / range : 0;
    if (t < 0.5) {
      blendEmotion = closestEmotion;
    } else {
      blendEmotion = nextEmotion;
    }
  } else if (
    prevEmotion.position < closestEmotion.position &&
    clampedPos < closestEmotion.position
  ) {
    const range = closestEmotion.position - prevEmotion.position;
    const t = range > 0 ? (closestEmotion.position - clampedPos) / range : 0;
    if (t < 0.5) {
      blendEmotion = closestEmotion;
    } else {
      blendEmotion = prevEmotion;
    }
  }

  return {
    name: blendEmotion.name,
    description: blendEmotion.description,
    color,
  };
}
