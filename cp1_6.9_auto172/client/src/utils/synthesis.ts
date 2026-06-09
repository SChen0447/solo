import { RecipeElements, RecipeConditions, SynthesisResult } from '../types';

const NAME_PREFIXES = ['星', '光', '暗', '辉', '幻', '晨', '深', '紫', '幽', '绮'];
const NAME_SUFFIXES = ['尘', '屑', '雾', '晶', '虹', '岚', '霭', '砂', '露', '羽'];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16)
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixColors(colors: string[], weights: number[]): string {
  let r = 0, g = 0, b = 0;
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) return '#8888ff';
  colors.forEach((c, i) => {
    const [cr, cg, cb] = hexToRgb(c);
    r += cr * weights[i];
    g += cg * weights[i];
    b += cb * weights[i];
  });
  return rgbToHex(r / total, g / total, b / total);
}

export function calculateSynthesis(
  elements: RecipeElements,
  conditions: RecipeConditions
): SynthesisResult {
  const total = elements.stardust + elements.lightdust + elements.darkmatter;

  if (total === 0) {
    return { success: false, name: '', color: '#8888ff', particleDensity: 0 };
  }

  const balanced = Math.min(elements.stardust, elements.lightdust, elements.darkmatter);
  const balanceScore = balanced > 0 && total > 0 ? (balanced * 3) / total : 0;

  const tempFactor = 1 - Math.abs(conditions.temperature - 25) / 300;
  const pressureFactor = 1 - Math.abs(conditions.pressure - 1.5) / 5;
  const stirFactor = conditions.stirRate / 100;

  const successProb = Math.min(0.95,
    0.25 + balanceScore * 0.35 + tempFactor * 0.15 + pressureFactor * 0.1 + stirFactor * 0.15
  );

  const success = Math.random() < successProb;

  const baseColor = mixColors(
    ['#ffcc66', '#66aaff', '#6633cc'],
    [elements.stardust, elements.lightdust, elements.darkmatter]
  );

  const temperature = conditions.temperature;
  let color = baseColor;
  if (temperature < 0) {
    const [r, g, b] = hexToRgb(baseColor);
    const coolFactor = Math.min(1, -temperature / 100);
    color = rgbToHex(r * (1 - coolFactor * 0.3), g * (1 - coolFactor * 0.1), b + coolFactor * 60);
  } else if (temperature > 100) {
    const [r, g, b] = hexToRgb(baseColor);
    const warmFactor = Math.min(1, (temperature - 100) / 100);
    color = rgbToHex(r + warmFactor * 80, g + warmFactor * 20, b * (1 - warmFactor * 0.2));
  }

  const particleDensity = Math.round(20 + total * 10 + conditions.pressure * 8 + conditions.stirRate * 0.5);

  if (!success) {
    return { success: false, name: '', color, particleDensity };
  }

  const p = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
  const s = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
  const s2 = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];

  return {
    success: true,
    name: p + s + s2,
    color,
    particleDensity: Math.min(200, particleDensity)
  };
}
