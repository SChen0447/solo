export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface WatercolorPalette {
  name: string;
  colors: string[];
}

export const PRESET_PALETTES: WatercolorPalette[] = [
  {
    name: '大地色系',
    colors: [
      '#8B6F47',
      '#A0826D',
      '#C4A484',
      '#E8D4A8',
      '#6B4423',
      '#8B7355',
      '#B8956E',
      '#D4B896',
      '#5C4033',
      '#7B5B3A',
      '#A68B5B',
      '#D9C3A4'
    ]
  },
  {
    name: '海洋色系',
    colors: [
      '#003366',
      '#005580',
      '#0077B6',
      '#00B4D8',
      '#023E8A',
      '#0077B6',
      '#48CAE4',
      '#90E0EF',
      '#1D3557',
      '#457B9D',
      '#A8DADC',
      '#CAF0F8'
    ]
  },
  {
    name: '森系绿色',
    colors: [
      '#2D5016',
      '#3A5A40',
      '#588157',
      '#A3B18A',
      '#1B4332',
      '#2D6A4F',
      '#40916C',
      '#95D5B2',
      '#081C15',
      '#1B4332',
      '#52B788',
      '#B7E4C7'
    ]
  },
  {
    name: '花卉色系',
    colors: [
      '#E63946',
      '#F77F00',
      '#FCBF49',
      '#FFB4A2',
      '#D62828',
      '#F4A261',
      '#E9C46A',
      '#FFCDB2',
      '#9B2226',
      '#BB3E03',
      '#EE9B00',
      '#FFE5D9'
    ]
  }
];

export const DEFAULT_COLORS: string[] = [
  '#C23B22',
  '#E87722',
  '#F4C430',
  '#5E8C31',
  '#2E8B8B',
  '#4A6FA5',
  '#6B4C9A',
  '#9B4D7E',
  '#8B4513',
  '#4A4A4A',
  '#2C2C2C',
  '#F5F5DC'
];

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('');
  }
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return { r, g, b };
}

export function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function subtractMix(c1: RGB, c2: RGB, c1Weight: number = 0.5): RGB {
  const w2 = 1 - c1Weight;
  const cmyk1 = rgbToCmyk(c1);
  const cmyk2 = rgbToCmyk(c2);
  const mixed = {
    c: cmyk1.c * c1Weight + cmyk2.c * w2,
    m: cmyk1.m * c1Weight + cmyk2.m * w2,
    y: cmyk1.y * c1Weight + cmyk2.y * w2,
    k: cmyk1.k * c1Weight + cmyk2.k * w2
  };
  return cmykToRgb(mixed);
}

interface CMYK {
  c: number;
  m: number;
  y: number;
  k: number;
}

function rgbToCmyk(rgb: RGB): CMYK {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 1 };
  return {
    c: (1 - r - k) / (1 - k),
    m: (1 - g - k) / (1 - k),
    y: (1 - b - k) / (1 - k),
    k
  };
}

function cmykToRgb(cmyk: CMYK): RGB {
  const { c, m, y, k } = cmyk;
  return {
    r: 255 * (1 - c) * (1 - k),
    g: 255 * (1 - m) * (1 - k),
    b: 255 * (1 - y) * (1 - k)
  };
}

export class PaletteManager {
  private colors: string[] = [...DEFAULT_COLORS];
  private currentColor: RGB = hexToRgb(DEFAULT_COLORS[0]);
  private residueColor: RGB | null = null;
  private listeners: Set<(color: RGB) => void> = new Set();
  private gridElement: HTMLElement | null = null;

  attachGrid(element: HTMLElement): void {
    this.gridElement = element;
    this.render();
  }

  render(): void {
    if (!this.gridElement) return;
    this.gridElement.innerHTML = '';
    const currentHex = rgbToHex(this.currentColor);

    this.colors.forEach((hex, index) => {
      const swatch = document.createElement('div');
      swatch.className = 'palette-swatch';
      swatch.style.backgroundColor = hex;
      swatch.dataset.color = hex;
      swatch.dataset.index = String(index);
      if (hex.toLowerCase() === currentHex.toLowerCase()) {
        swatch.classList.add('active');
      }
      swatch.addEventListener('click', () => this.selectColor(hex));
      this.gridElement!.appendChild(swatch);
    });
  }

  selectColor(hex: string): void {
    this.currentColor = hexToRgb(hex);
    this.residueColor = { ...this.currentColor };
    this.render();
    this.emitChange();
  }

  addCustomColor(hex: string): void {
    const normalized = hex.toLowerCase();
    if (this.colors.map(c => c.toLowerCase()).includes(normalized)) {
      this.selectColor(hex);
      return;
    }
    this.colors.push(hex);
    this.selectColor(hex);
  }

  getCurrentColor(): RGB {
    return this.currentColor;
  }

  getResidueColor(): RGB | null {
    return this.residueColor;
  }

  setResidueColor(rgb: RGB): void {
    this.residueColor = rgb;
  }

  mixWithResidue(newColor: RGB): RGB {
    if (!this.residueColor) {
      this.residueColor = { ...newColor };
      return newColor;
    }
    const mixed = subtractMix(newColor, this.residueColor, 0.65);
    this.residueColor = mixed;
    return mixed;
  }

  onChange(callback: (color: RGB) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emitChange(): void {
    this.listeners.forEach(cb => cb(this.currentColor));
  }

  getColors(): string[] {
    return [...this.colors];
  }
}
