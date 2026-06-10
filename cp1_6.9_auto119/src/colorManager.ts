export interface RGB {
  r: number;
  g: number;
  b: number;
}

const PALETTE_HEX: string[] = [
  '#ff3366',
  '#33ff66',
  '#3366ff',
  '#ffcc33',
  '#aa66ff'
];

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

const PALETTE_RGB: RGB[] = PALETTE_HEX.map(hexToRgb);

export class ColorManager {
  private colorIndex: number = 0;
  private transitionProgress: number = 0;
  private transitionSpeed: number = 0.008;

  getCurrentColor(): RGB {
    const current = PALETTE_RGB[this.colorIndex];
    const next = PALETTE_RGB[(this.colorIndex + 1) % PALETTE_RGB.length];
    const t = this.transitionProgress;
    return {
      r: Math.round(current.r + (next.r - current.r) * t),
      g: Math.round(current.g + (next.g - current.g) * t),
      b: Math.round(current.b + (next.b - current.b) * t)
    };
  }

  getNextColor(): RGB {
    this.transitionProgress += this.transitionSpeed;
    if (this.transitionProgress >= 1) {
      this.transitionProgress = 0;
      this.colorIndex = (this.colorIndex + 1) % PALETTE_RGB.length;
    }
    return this.getCurrentColor();
  }

  reset(): void {
    this.colorIndex = 0;
    this.transitionProgress = 0;
  }

  static lerp(a: RGB, b: RGB, t: number): RGB {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t)
    };
  }

  static getPaletteHex(): string[] {
    return [...PALETTE_HEX];
  }
}
