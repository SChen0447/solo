export type GradientType = 'linear' | 'radial' | 'conic';

export interface GradientConfig {
  type: GradientType;
  angle: number;
  colors: string[];
}

export function generateGradientCSS(config: GradientConfig): string {
  const { type, angle, colors } = config;
  const colorStops = colors.map((color, index) => {
    const position = (index / (colors.length - 1)) * 100;
    return `${color} ${position.toFixed(1)}%`;
  }).join(', ');

  switch (type) {
    case 'linear':
      return `linear-gradient(${angle}deg, ${colorStops})`;
    case 'radial':
      return `radial-gradient(circle at center, ${colorStops})`;
    case 'conic':
      return `conic-gradient(from ${angle}deg at center, ${colorStops})`;
    default:
      return `linear-gradient(${angle}deg, ${colorStops})`;
  }
}

export function generateFallbackColor(config: GradientConfig): string {
  return config.colors[0] || '#000000';
}

export function generateFullCSS(config: GradientConfig): string {
  const fallback = generateFallbackColor(config);
  const gradient = generateGradientCSS(config);
  return [
    `background-color: ${fallback};`,
    `background: ${fallback};`,
    `background: ${gradient};`
  ].join('\n');
}

export function renderGradientToCanvas(
  canvas: HTMLCanvasElement,
  config: GradientConfig
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  let gradient: CanvasGradient;
  const { type, angle, colors } = config;

  switch (type) {
    case 'linear': {
      const rad = (angle - 90) * (Math.PI / 180);
      const centerX = width / 2;
      const centerY = height / 2;
      const length = Math.sqrt(width * width + height * height) / 2;
      const x1 = centerX - Math.cos(rad) * length;
      const y1 = centerY - Math.sin(rad) * length;
      const x2 = centerX + Math.cos(rad) * length;
      const y2 = centerY + Math.sin(rad) * length;
      gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      break;
    }
    case 'radial': {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.max(width, height) / 2;
      gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      break;
    }
    case 'conic':
    default: {
      const rad = (angle - 90) * (Math.PI / 180);
      const centerX = width / 2;
      const centerY = height / 2;
      const length = Math.sqrt(width * width + height * height) / 2;
      const x1 = centerX - Math.cos(rad) * length;
      const y1 = centerY - Math.sin(rad) * length;
      const x2 = centerX + Math.cos(rad) * length;
      const y2 = centerY + Math.sin(rad) * length;
      gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      break;
    }
  }

  colors.forEach((color, index) => {
    const position = index / (colors.length - 1);
    gradient.addColorStop(position, color);
  });

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

export const DEFAULT_GRADIENT_CONFIG: GradientConfig = {
  type: 'linear',
  angle: 90,
  colors: ['#0f2027', '#203a43', '#2c5364']
};
