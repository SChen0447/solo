export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export const PRESET_PALETTE: { name: string; hex: string }[] = [
  { name: '朱红', hex: '#c0392b' },
  { name: '金色', hex: '#d4a017' },
  { name: '钴蓝', hex: '#2c3e80' },
  { name: '翠绿', hex: '#27ae60' },
  { name: '紫色', hex: '#6c3483' },
  { name: '橙色', hex: '#e67e22' },
  { name: '粉红', hex: '#e91e63' },
  { name: '青色', hex: '#16a085' },
  { name: '深褐', hex: '#5d4037' },
  { name: '象牙白', hex: '#f5f5dc' },
  { name: '群青', hex: '#1e3a8a' },
  { name: '土黄', hex: '#b8860b' }
];

export class PaletteManager {
  private currentColor: RGB;

  constructor() {
    this.currentColor = this.hexToRgb(PRESET_PALETTE[0].hex);
  }

  getPalette(): { name: string; hex: string }[] {
    return PRESET_PALETTE;
  }

  getCurrentColor(): RGB {
    return { ...this.currentColor };
  }

  setCurrentColor(hex: string): void {
    this.currentColor = this.hexToRgb(hex);
  }

  hexToRgb(hex: string): RGB {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  }

  rgbToHex(rgb: RGB): string {
    return (
      '#' +
      [rgb.r, rgb.g, rgb.b]
        .map(x => {
          const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  }

  rgbToHsl(rgb: RGB): HSL {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
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
  }

  hslToRgb(hsl: HSL): RGB {
    const h = hsl.h / 360;
    const s = hsl.s / 100;
    const l = hsl.l / 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  blendColors(newColor: RGB, existingColor: RGB): RGB {
    const blended: RGB = {
      r: newColor.r * 0.7 + existingColor.r * 0.3,
      g: newColor.g * 0.7 + existingColor.g * 0.3,
      b: newColor.b * 0.7 + existingColor.b * 0.3
    };

    const hsl = this.rgbToHsl(blended);
    const hueShift = (Math.random() - 0.5) * 10;
    hsl.h = (hsl.h + hueShift + 360) % 360;

    const result = this.hslToRgb(hsl);

    result.r += (Math.random() - 0.5) * 10;
    result.g += (Math.random() - 0.5) * 10;
    result.b += (Math.random() - 0.5) * 10;

    return {
      r: Math.max(0, Math.min(255, Math.round(result.r))),
      g: Math.max(0, Math.min(255, Math.round(result.g))),
      b: Math.max(0, Math.min(255, Math.round(result.b)))
    };
  }

  darkenColor(color: RGB, percentage: number): RGB {
    const hsl = this.rgbToHsl(color);
    hsl.l = Math.max(0, hsl.l * (1 - percentage));
    return this.hslToRgb(hsl);
  }

  adjustColorBySpeed(color: RGB, speed: number): RGB {
    const factor = Math.max(0.6, Math.min(1.4, 1 - speed * 0.008));
    const hsl = this.rgbToHsl(color);
    hsl.l = Math.max(10, Math.min(90, hsl.l * factor));
    return this.hslToRgb(hsl);
  }
}
