export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface ColorBlock {
  hsl: HSL;
  hex: string;
  name: string;
  isTarget: boolean;
  row: number;
  col: number;
  found: boolean;
}

export type FilterType = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

const COLOR_NAMES: Array<{ hex: string; name: string; h: number }> = [
  { hex: '#FF0000', name: '红色', h: 0 },
  { hex: '#FF4500', name: '橙红', h: 15 },
  { hex: '#FF7F50', name: '珊瑚红', h: 16 },
  { hex: '#FFA500', name: '橙色', h: 30 },
  { hex: '#FFD700', name: '金色', h: 51 },
  { hex: '#FFFF00', name: '黄色', h: 60 },
  { hex: '#ADFF2F', name: '黄绿', h: 84 },
  { hex: '#00FF00', name: '绿色', h: 120 },
  { hex: '#32CD32', name: '酸橙绿', h: 122 },
  { hex: '#2E8B57', name: '海绿', h: 146 },
  { hex: '#00FFFF', name: '青色', h: 180 },
  { hex: '#00CED1', name: '深青', h: 181 },
  { hex: '#4169E1', name: '皇家蓝', h: 225 },
  { hex: '#0000FF', name: '蓝色', h: 240 },
  { hex: '#4682B4', name: '钢蓝', h: 207 },
  { hex: '#8A2BE2', name: '蓝紫', h: 271 },
  { hex: '#9370DB', name: '中紫', h: 260 },
  { hex: '#FF00FF', name: '品红', h: 300 },
  { hex: '#FF69B4', name: '热粉', h: 330 },
  { hex: '#FF1493', name: '深粉', h: 328 },
  { hex: '#8B4513', name: '赭色', h: 30 },
  { hex: '#A0522D', name: '赭褐', h: 25 },
  { hex: '#D2691E', name: '巧克力', h: 25 },
  { hex: '#DEB887', name: '赭黄', h: 34 },
  { hex: '#F5DEB3', name: '小麦色', h: 39 },
  { hex: '#808080', name: '灰色', h: 0 },
  { hex: '#C0C0C0', name: '银色', h: 0 },
  { hex: '#FFFAF0', name: '花白', h: 36 },
  { hex: '#708090', name: '石板灰', h: 210 },
  { hex: '#2F4F4F', name: '暗青灰', h: 180 },
];

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function hexToHsl(hex: string): HSL {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function getColorName(hex: string): string {
  const targetHsl = hexToHsl(hex);
  let bestMatch = COLOR_NAMES[0];
  let bestDist = Infinity;
  for (const cn of COLOR_NAMES) {
    const dist = Math.min(
      Math.abs(targetHsl.h - cn.h),
      360 - Math.abs(targetHsl.h - cn.h)
    );
    if (dist < bestDist) {
      bestDist = dist;
      bestMatch = cn;
    }
  }
  return bestMatch.name;
}

export class ColorMatrix {
  public matrix: ColorBlock[] = [];
  public rows: number;
  public cols: number;
  public targetCount: number;

  constructor(rows: number = 5, cols: number = 8, targetCount: number = 5) {
    this.rows = rows;
    this.cols = cols;
    this.targetCount = targetCount;
  }

  public generateMatrix(): ColorBlock[] {
    this.matrix = [];
    const total = this.rows * this.cols;

    const baseH = Math.floor(Math.random() * 360);
    const baseS = Math.floor(Math.random() * 30) + 60;
    const baseL = Math.floor(Math.random() * 30) + 40;

    const targetIndices = new Set<number>();
    while (targetIndices.size < this.targetCount) {
      targetIndices.add(Math.floor(Math.random() * total));
    }

    for (let i = 0; i < total; i++) {
      const row = Math.floor(i / this.cols);
      const col = i % this.cols;
      const isTarget = targetIndices.has(i);

      let h: number, s: number, l: number;
      if (isTarget) {
        const hueShift = (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 5) + 1);
        h = (baseH + hueShift + 360) % 360;
        s = baseS + Math.floor(Math.random() * 3) - 1;
        l = baseL + Math.floor(Math.random() * 3) - 1;
      } else {
        const hueJitter = Math.floor(Math.random() * 3) - 1;
        h = (baseH + hueJitter + 360) % 360;
        s = baseS + Math.floor(Math.random() * 3) - 1;
        l = baseL + Math.floor(Math.random() * 3) - 1;
      }

      s = Math.max(0, Math.min(100, s));
      l = Math.max(0, Math.min(100, l));

      const hex = hslToHex(h, s, l);
      this.matrix.push({
        hsl: { h, s, l },
        hex,
        name: getColorName(hex),
        isTarget,
        row,
        col,
        found: false,
      });
    }

    return this.matrix;
  }

  public applyFilter(type: FilterType, container: HTMLElement): void {
    switch (type) {
      case 'protanopia':
        container.style.filter = 'url(#protanopia-filter)';
        container.style.webkitFilter = 'url(#protanopia-filter)';
        break;
      case 'deuteranopia':
        container.style.filter = 'url(#deuteranopia-filter)';
        container.style.webkitFilter = 'url(#deuteranopia-filter)';
        break;
      case 'tritanopia':
        container.style.filter = 'url(#tritanopia-filter)';
        container.style.webkitFilter = 'url(#tritanopia-filter)';
        break;
      default:
        container.style.filter = 'none';
        container.style.webkitFilter = 'none';
        break;
    }
  }

  public getTargetBlocks(): ColorBlock[] {
    return this.matrix.filter(b => b.isTarget);
  }

  public getFoundCount(): number {
    return this.matrix.filter(b => b.isTarget && b.found).length;
  }
}
