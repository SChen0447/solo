import { saveAs } from 'file-saver';
import { cloneDeep } from 'lodash';

export type BuildingType = 'residential' | 'commercial' | 'industrial';

export interface ColorBlock {
  id: string;
  type: BuildingType;
  color: string;
}

export interface PaletteExport {
  blocks: ColorBlock[];
  exportedAt: string;
}

const TYPE_LABELS: Record<BuildingType, string> = {
  residential: '住宅',
  commercial: '商业',
  industrial: '工业'
};

const TYPE_PRIMARY_COLORS: Record<BuildingType, string> = {
  residential: '#4a90d9',
  commercial: '#e67e22',
  industrial: '#7f8c8d'
};

const DEFAULT_PALETTES: Record<BuildingType, string[]> = {
  residential: ['#4a90d9', '#3b7abf', '#5dade2', '#2e86c1', '#85c1e9', '#1f618d'],
  commercial: ['#e67e22', '#d35400', '#f39c12', '#e74c3c', '#eb984e', '#c0392b'],
  industrial: ['#7f8c8d', '#95a5a6', '#bdc3c7', '#5d6d7e', '#a6acaf', '#34495e']
};

export function getTypeLabel(type: BuildingType): string {
  return TYPE_LABELS[type];
}

export function getTypePrimaryColor(type: BuildingType): string {
  return TYPE_PRIMARY_COLORS[type];
}

function generateId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
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
  return { h: h * 360, s, v };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360;
  h /= 360;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function generateSimilarColors(baseHex: string, count: number, maxHueDiff: number = 30): string[] {
  const { r, g, b } = hexToRgb(baseHex);
  const { h, s, v } = rgbToHsv(r, g, b);
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const hueOffset = (Math.random() * 2 - 1) * maxHueDiff;
    const satOffset = (Math.random() * 2 - 1) * 0.15;
    const valOffset = (Math.random() * 2 - 1) * 0.15;
    const newH = h + hueOffset;
    const newS = Math.max(0.3, Math.min(1, s + satOffset));
    const newV = Math.max(0.3, Math.min(1, v + valOffset));
    const newRgb = hsvToRgb(newH, newS, newV);
    colors.push(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  }
  return colors;
}

export class PaletteManager {
  private blocks: ColorBlock[] = [];

  constructor() {
    this.resetToDefault();
  }

  resetToDefault(): void {
    this.blocks = [];
    const types: BuildingType[] = ['residential', 'commercial', 'industrial'];
    types.forEach((type) => {
      const palette = DEFAULT_PALETTES[type];
      for (let i = 0; i < 4; i++) {
        this.blocks.push({
          id: generateId(),
          type,
          color: palette[i % palette.length]
        });
      }
    });
  }

  randomize(): void {
    const types: BuildingType[] = ['residential', 'commercial', 'industrial'];
    this.blocks = [];
    types.forEach((type) => {
      const primaryColor = TYPE_PRIMARY_COLORS[type];
      const similarColors = generateSimilarColors(primaryColor, 5, 30);
      for (let i = 0; i < 4; i++) {
        this.blocks.push({
          id: generateId(),
          type,
          color: similarColors[i]
        });
      }
    });
  }

  getBlocks(): ColorBlock[] {
    return cloneDeep(this.blocks);
  }

  addBlock(type: BuildingType): ColorBlock {
    const palette = DEFAULT_PALETTES[type];
    const existingCount = this.blocks.filter((b) => b.type === type).length;
    const newBlock: ColorBlock = {
      id: generateId(),
      type,
      color: palette[existingCount % palette.length]
    };
    this.blocks.push(newBlock);
    return cloneDeep(newBlock);
  }

  removeBlock(id: string): boolean {
    const index = this.blocks.findIndex((b) => b.id === id);
    if (index !== -1) {
      this.blocks.splice(index, 1);
      return true;
    }
    return false;
  }

  updateBlockColor(id: string, color: string): void {
    const block = this.blocks.find((b) => b.id === id);
    if (block) {
      block.color = color;
    }
  }

  getBlockById(id: string): ColorBlock | undefined {
    const block = this.blocks.find((b) => b.id === id);
    return block ? cloneDeep(block) : undefined;
  }

  getCounts(): Record<BuildingType, number> & { total: number } {
    const counts: Record<BuildingType, number> = {
      residential: 0,
      commercial: 0,
      industrial: 0
    };
    this.blocks.forEach((b) => {
      counts[b.type]++;
    });
    return {
      ...counts,
      total: this.blocks.length
    };
  }

  exportToJson(): void {
    const data: PaletteExport = {
      blocks: this.getBlocks(),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `palette_${Date.now()}.json`);
  }

  exportToSvg(): string {
    const blocks = this.getBlocks();
    const cols = 4;
    const cellSize = 80;
    const gap = 2;
    const rows = Math.ceil(blocks.length / cols);
    const width = cols * cellSize + (cols - 1) * gap;
    const height = rows * cellSize + (rows - 1) * gap;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;
    svg += `  <rect width="100%" height="100%" fill="#2c3e50"/>\n`;
    blocks.forEach((block, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = col * (cellSize + gap);
      const y = row * (cellSize + gap);
      svg += `  <rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${block.color}"/>\n`;
    });
    svg += `</svg>`;
    return svg;
  }
}
