export interface ColorStop {
  id: string;
  color: string;
  position: number;
  opacity: number;
}

export type GradientType = 'linear' | 'radial';
export type RadialShape = 'circle' | 'ellipse';

export interface GradientConfig {
  type: GradientType;
  angle: number;
  shape: RadialShape;
  centerX: number;
  centerY: number;
  colorStops: ColorStop[];
}

export interface GradientPreset {
  name: string;
  config: GradientConfig;
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
};

const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
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
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

export const hexToHsl = (hex: string): { h: number; s: number; l: number } | null => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
};

const formatNumber = (num: number, decimals: number = 3): string => {
  return Number(num.toFixed(decimals)).toString();
};

const rgbaToHex = (color: string): string => {
  if (color.startsWith('#')) return color;
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  return color;
};

const colorStopToCss = (stop: ColorStop): string => {
  const hexColor = rgbaToHex(stop.color);
  const position = formatNumber(stop.position) + '%';
  if (stop.opacity < 1) {
    const rgb = hexToRgb(hexColor);
    if (rgb) {
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${formatNumber(stop.opacity)}) ${position}`;
    }
  }
  return `${hexColor} ${position}`;
};

export const generateLinearGradientCss = (
  angle: number,
  colorStops: ColorStop[]
): string => {
  const sortedStops = [...colorStops].sort((a, b) => a.position - b.position);
  const stopsStr = sortedStops.map(colorStopToCss).join(', ');
  return `linear-gradient(${formatNumber(angle)}deg, ${stopsStr})`;
};

export const generateRadialGradientCss = (
  shape: RadialShape,
  centerX: number,
  centerY: number,
  colorStops: ColorStop[]
): string => {
  const sortedStops = [...colorStops].sort((a, b) => a.position - b.position);
  const stopsStr = sortedStops.map(colorStopToCss).join(', ');
  const cx = formatNumber(centerX) + '%';
  const cy = formatNumber(centerY) + '%';
  return `radial-gradient(${shape} at ${cx} ${cy}, ${stopsStr})`;
};

export const generateGradientCss = (config: GradientConfig): string => {
  if (config.type === 'radial') {
    return generateRadialGradientCss(
      config.shape,
      config.centerX,
      config.centerY,
      config.colorStops
    );
  }
  return generateLinearGradientCss(config.angle, config.colorStops);
};

export const generateSvgBackground = (config: GradientConfig, width: number = 800, height: number = 600): string => {
  const gradientId = 'gradient-bg';
  const sortedStops = [...config.colorStops].sort((a, b) => a.position - b.position);

  let gradientElement: string;

  if (config.type === 'radial') {
    gradientElement = `<radialGradient id="${gradientId}" cx="${config.centerX}%" cy="${config.centerY}%" r="75%" gradientUnits="userSpaceOnUse">
${sortedStops
  .map(
    (stop) =>
      `      <stop offset="${stop.position}%" stop-color="${rgbaToHex(stop.color)}" stop-opacity="${stop.opacity}" />`
  )
  .join('\n')}
    </radialGradient>`;
  } else {
    const angleRad = (config.angle * Math.PI) / 180;
    const cx = 0.5;
    const cy = 0.5;
    const length = 0.5;
    const x1 = (cx - Math.cos(angleRad) * length) * 100;
    const y1 = (cy - Math.sin(angleRad) * length) * 100;
    const x2 = (cx + Math.cos(angleRad) * length) * 100;
    const y2 = (cy + Math.sin(angleRad) * length) * 100;

    gradientElement = `<linearGradient id="${gradientId}" x1="${x1.toFixed(3)}%" y1="${y1.toFixed(3)}%" x2="${x2.toFixed(3)}%" y2="${y2.toFixed(3)}%">
${sortedStops
  .map(
    (stop) =>
      `      <stop offset="${stop.position}%" stop-color="${rgbaToHex(stop.color)}" stop-opacity="${stop.opacity}" />`
  )
  .join('\n')}
    </linearGradient>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    ${gradientElement}
  </defs>
  <rect width="100%" height="100%" fill="url(#${gradientId})" />
</svg>`;
};

const createId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const createColorStop = (color: string, position: number, opacity: number = 1): ColorStop => ({
  id: createId(),
  color,
  position,
  opacity
});

export const gradientPresets: GradientPreset[] = [
  {
    name: '日出色',
    config: {
      type: 'linear',
      angle: 180,
      shape: 'circle',
      centerX: 50,
      centerY: 50,
      colorStops: [
        createColorStop('#FF512F', 0, 1),
        createColorStop('#F09819', 50, 1),
        createColorStop('#DD2476', 100, 1)
      ]
    }
  },
  {
    name: '极光',
    config: {
      type: 'linear',
      angle: 135,
      shape: 'circle',
      centerX: 50,
      centerY: 50,
      colorStops: [
        createColorStop('#00F5A0', 0, 1),
        createColorStop('#00D9F5', 50, 1),
        createColorStop('#7B68EE', 100, 1)
      ]
    }
  },
  {
    name: '海洋',
    config: {
      type: 'linear',
      angle: 180,
      shape: 'circle',
      centerX: 50,
      centerY: 50,
      colorStops: [
        createColorStop('#2E3192', 0, 1),
        createColorStop('#1BFFFF', 100, 1)
      ]
    }
  },
  {
    name: '赛博朋克',
    config: {
      type: 'linear',
      angle: 135,
      shape: 'circle',
      centerX: 50,
      centerY: 50,
      colorStops: [
        createColorStop('#FF00FF', 0, 1),
        createColorStop('#00FFFF', 50, 1),
        createColorStop('#FFFF00', 100, 1)
      ]
    }
  },
  {
    name: '梦幻紫',
    config: {
      type: 'linear',
      angle: 135,
      shape: 'circle',
      centerX: 50,
      centerY: 50,
      colorStops: [
        createColorStop('#667eea', 0, 1),
        createColorStop('#764ba2', 100, 1)
      ]
    }
  },
  {
    name: '落日余晖',
    config: {
      type: 'linear',
      angle: 90,
      shape: 'circle',
      centerX: 50,
      centerY: 50,
      colorStops: [
        createColorStop('#fa709a', 0, 1),
        createColorStop('#fee140', 100, 1)
      ]
    }
  },
  {
    name: '薄荷清新',
    config: {
      type: 'linear',
      angle: 135,
      shape: 'circle',
      centerX: 50,
      centerY: 50,
      colorStops: [
        createColorStop('#96E6A1', 0, 1),
        createColorStop('#D4FC79', 100, 1)
      ]
    }
  },
  {
    name: '深邃星空',
    config: {
      type: 'radial',
      angle: 0,
      shape: 'ellipse',
      centerX: 50,
      centerY: 30,
      colorStops: [
        createColorStop('#0F2027', 0, 1),
        createColorStop('#203A43', 50, 1),
        createColorStop('#2C5364', 100, 1)
      ]
    }
  },
  {
    name: '粉红玫瑰',
    config: {
      type: 'linear',
      angle: 45,
      shape: 'circle',
      centerX: 50,
      centerY: 50,
      colorStops: [
        createColorStop('#ff9a9e', 0, 1),
        createColorStop('#fecfef', 100, 1)
      ]
    }
  },
  {
    name: '柠檬苏打',
    config: {
      type: 'linear',
      angle: 120,
      shape: 'circle',
      centerX: 50,
      centerY: 50,
      colorStops: [
        createColorStop('#f6d365', 0, 1),
        createColorStop('#fda085', 100, 1)
      ]
    }
  },
  {
    name: '蓝莓冰沙',
    config: {
      type: 'linear',
      angle: 135,
      shape: 'circle',
      centerX: 50,
      centerY: 50,
      colorStops: [
        createColorStop('#a18cd1', 0, 1),
        createColorStop('#fbc2eb', 100, 1)
      ]
    }
  },
  {
    name: '火焰燃烧',
    config: {
      type: 'linear',
      angle: 180,
      shape: 'circle',
      centerX: 50,
      centerY: 50,
      colorStops: [
        createColorStop('#f12711', 0, 1),
        createColorStop('#f5af19', 100, 1)
      ]
    }
  },
  {
    name: '森林深处',
    config: {
      type: 'linear',
      angle: 180,
      shape: 'circle',
      centerX: 50,
      centerY: 50,
      colorStops: [
        createColorStop('#134E5E', 0, 1),
        createColorStop('#71B280', 100, 1)
      ]
    }
  },
  {
    name: '薰衣草田',
    config: {
      type: 'linear',
      angle: 160,
      shape: 'circle',
      centerX: 50,
      centerY: 50,
      colorStops: [
        createColorStop('#E0EAFC', 0, 1),
        createColorStop('#CFDEF3', 100, 1)
      ]
    }
  },
  {
    name: '彩虹糖果',
    config: {
      type: 'linear',
      angle: 90,
      shape: 'circle',
      centerX: 50,
      centerY: 50,
      colorStops: [
        createColorStop('#f093fb', 0, 1),
        createColorStop('#f5576c', 33, 1),
        createColorStop('#4facfe', 66, 1),
        createColorStop('#00f2fe', 100, 1)
      ]
    }
  },
  {
    name: '暗夜霓虹',
    config: {
      type: 'radial',
      angle: 0,
      shape: 'circle',
      centerX: 50,
      centerY: 50,
      colorStops: [
        createColorStop('#000428', 0, 1),
        createColorStop('#004e92', 100, 1)
      ]
    }
  },
  {
    name: '蜜桃成熟',
    config: {
      type: 'linear',
      angle: 135,
      shape: 'circle',
      centerX: 50,
      centerY: 50,
      colorStops: [
        createColorStop('#ffecd2', 0, 1),
        createColorStop('#fcb69f', 100, 1)
      ]
    }
  },
  {
    name: '午夜蓝调',
    config: {
      type: 'linear',
      angle: 135,
      shape: 'circle',
      centerX: 50,
      centerY: 50,
      colorStops: [
        createColorStop('#2c3e50', 0, 1),
        createColorStop('#4ca1af', 100, 1)
      ]
    }
  },
  {
    name: '金色黄昏',
    config: {
      type: 'linear',
      angle: 180,
      shape: 'circle',
      centerX: 50,
      centerY: 50,
      colorStops: [
        createColorStop('#FF8008', 0, 1),
        createColorStop('#FFC837', 100, 1)
      ]
    }
  },
  {
    name: '樱花飞舞',
    config: {
      type: 'radial',
      angle: 0,
      shape: 'ellipse',
      centerX: 50,
      centerY: 50,
      colorStops: [
        createColorStop('#FFDEE9', 0, 1),
        createColorStop('#B5FFFC', 100, 1)
      ]
    }
  }
];

export const defaultGradientConfig: GradientConfig = {
  type: 'linear',
  angle: 135,
  shape: 'circle',
  centerX: 50,
  centerY: 50,
  colorStops: [
    createColorStop('#667eea', 0, 1),
    createColorStop('#764ba2', 50, 1),
    createColorStop('#f093fb', 100, 1)
  ]
};
