import type { LightConfig } from "@/data/templates";

export interface ShadowParams {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
}

interface ColorAnchor {
  kelvin: number;
  r: number;
  g: number;
  b: number;
}

const COLOR_ANCHORS: ColorAnchor[] = [
  { kelvin: 2700, r: 255, g: 210, b: 127 },
  { kelvin: 4000, r: 255, g: 228, b: 181 },
  { kelvin: 5000, r: 255, g: 245, b: 230 },
  { kelvin: 6500, r: 204, g: 229, b: 255 },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${clamp(r).toString(16).padStart(2, "0")}${clamp(g).toString(16).padStart(2, "0")}${clamp(b).toString(16).padStart(2, "0")}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function temperatureToColor(kelvin: number): string {
  const k = Math.max(2700, Math.min(6500, kelvin));

  let lower = COLOR_ANCHORS[0];
  let upper = COLOR_ANCHORS[COLOR_ANCHORS.length - 1];

  for (let i = 0; i < COLOR_ANCHORS.length - 1; i++) {
    if (k >= COLOR_ANCHORS[i].kelvin && k <= COLOR_ANCHORS[i + 1].kelvin) {
      lower = COLOR_ANCHORS[i];
      upper = COLOR_ANCHORS[i + 1];
      break;
    }
  }

  const t = (k - lower.kelvin) / (upper.kelvin - lower.kelvin);
  const r = lerp(lower.r, upper.r, t);
  const g = lerp(lower.g, upper.g, t);
  const b = lerp(lower.b, upper.b, t);

  return rgbToHex(r, g, b);
}

function darkenColor(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * factor, g * factor, b * factor);
}

export function calculateShadow(
  light: LightConfig,
  layerIndex: number,
  totalLayers: number
): ShadowParams {
  const distanceFactor = (totalLayers - layerIndex) / totalLayers;

  const offsetX = light.horizontalAngle * 0.4 * distanceFactor;
  const offsetY =
    light.verticalAngle * 0.3 * distanceFactor +
    (totalLayers - layerIndex) * 2;
  const blur = light.brightness * 0.15 * (totalLayers - layerIndex);

  const tempColor = temperatureToColor(light.colorTemperature);
  const shadowBase = darkenColor(tempColor, 0.2);
  const opacity = light.brightness * 0.6 * distanceFactor + 0.15;

  const { r, g, b } = hexToRgb(shadowBase);
  const color = `rgba(${r},${g},${b},${opacity.toFixed(2)})`;

  return { offsetX, offsetY, blur, color };
}

export function getShadowCSS(shadow: ShadowParams): string {
  return `drop-shadow(${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.color})`;
}

export function getLightGlowCSS(light: LightConfig): string {
  const tempColor = temperatureToColor(light.colorTemperature);
  const { r, g, b } = hexToRgb(tempColor);
  const opacity = light.brightness;

  const cx = 50 + light.horizontalAngle;
  const cy = 50 + light.verticalAngle;

  return `radial-gradient(ellipse at ${cx}% ${cy}%, rgba(${r},${g},${b},${opacity.toFixed(2)}) 0%, transparent 70%)`;
}
