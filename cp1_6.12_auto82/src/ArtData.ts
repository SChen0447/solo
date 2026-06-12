export interface Painting {
  id: string;
  name: string;
  colors: string[];
  layout: 'scatter' | 'spiral' | 'grid' | 'radial' | 'wave';
  description: string;
}

export const PAINTINGS: Painting[] = [
  {
    id: 'lava',
    name: '熔岩',
    colors: ['#FF4500', '#FF6347', '#FF7F50', '#FFD700'],
    layout: 'radial',
    description: '炽热的岩浆从深处喷涌，呈现出橙红色的涌动能量'
  },
  {
    id: 'ocean',
    name: '深海',
    colors: ['#0077B6', '#00B4D8', '#90E0EF', '#48CAE4'],
    layout: 'wave',
    description: '宁静的深海蓝调，水波层层荡漾出清凉的韵律'
  },
  {
    id: 'forest',
    name: '秘境森林',
    colors: ['#2D6A4F', '#40916C', '#52B788', '#95D5B2'],
    layout: 'scatter',
    description: '翠绿交织的神秘森林，生机盎然的自然呼吸'
  },
  {
    id: 'aurora',
    name: '极光',
    colors: ['#7209B7', '#B5179E', '#F72585', '#4CC9F0'],
    layout: 'spiral',
    description: '北极夜空中绚烂的极光，紫色与粉色交织飞舞'
  },
  {
    id: 'sunset',
    name: '黄昏',
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'],
    layout: 'grid',
    description: '日落时分的温柔光影，冷暖色平衡交融的诗意'
  }
];

export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
};

export const lerpColor = (
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } => {
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * t),
    g: Math.round(color1.g + (color2.g - color1.g) * t),
    b: Math.round(color1.b + (color2.b - color1.b) * t)
  };
};

export const rgbToString = (rgb: { r: number; g: number; b: number }, alpha: number = 1): string => {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};
